import { calculateCompatibility } from '../services/matchingService.js';
import { findOne, insert, list, update } from '../services/fileStore.js';

async function currentProfile(user) {
  const collection = user.role === 'mentor' ? 'mentorProfiles' : 'learnerProfiles';
  return findOne(collection, (item) => item.userId === user.id);
}

export async function candidates(req, res) {
  if (['admin', 'staff'].includes(req.user.role)) return res.json({ candidates: [] });

  const userProfile = await currentProfile(req.user);
  if (!userProfile) return res.status(400).json({ message: 'Complete onboarding before matching.' });

  const targetRole = req.user.role === 'learner' ? 'mentor' : 'learner';
  const targetProfiles = await list(targetRole === 'mentor' ? 'mentorProfiles' : 'learnerProfiles');
  const users = await list('users');
  const swipes = await list('matchRequests');
  const blocked = new Set(req.user.blockedUsers || []);
  const activeMatches = await list('matches');
  const connectedIds = new Set(activeMatches
    .filter((match) => match.status === 'matched' && [match.learnerId, match.mentorId].includes(req.user.id))
    .map((match) => match.learnerId === req.user.id ? match.mentorId : match.learnerId));
  const alreadyActed = new Set(swipes
    .filter((item) => item.fromUserId === req.user.id && ['connect', 'skip'].includes(item.action) && item.status !== 'declined')
    .map((item) => item.toUserId));

  const candidates = targetProfiles
    .filter((profile) => !blocked.has(profile.userId) && !alreadyActed.has(profile.userId) && !connectedIds.has(profile.userId))
    .map((profile) => {
      const user = users.find((item) => item.id === profile.userId);
      const pair = req.user.role === 'learner'
        ? calculateCompatibility(userProfile, profile)
        : calculateCompatibility(profile, userProfile);
      return { user: user && { id: user.id, name: user.name, role: user.role }, profile, compatibility: pair };
    })
    .filter((item) => item.user)
    .sort((a, b) => b.compatibility.score - a.compatibility.score);

  res.json({ candidates });
}

export async function swipe(req, res) {
  const { targetUserId, action } = req.body;
  if (!['connect', 'skip', 'save'].includes(action)) return res.status(400).json({ message: 'Invalid swipe action.' });

  const target = await findOne('users', (item) => item.id === targetUserId);
  if (!target) return res.status(404).json({ message: 'User not found.' });
  if (req.user.role === target.role || ['admin', 'staff'].includes(req.user.role) || ['admin', 'staff'].includes(target.role)) {
    return res.status(400).json({ message: 'BridgeUp only matches learners with mentors.' });
  }

  const existingPending = await findOne('matchRequests', (item) =>
    item.fromUserId === req.user.id
    && item.toUserId === targetUserId
    && item.action === 'connect'
    && item.status === 'pending'
  );
  if (action === 'connect' && existingPending) return res.json({ request: existingPending, match: null });

  const request = await insert('matchRequests', {
    fromUserId: req.user.id,
    toUserId: targetUserId,
    action,
    status: action === 'connect' ? 'pending' : 'accepted',
    viewedAt: null,
    resolvedAt: action === 'connect' ? null : new Date().toISOString()
  });
  if (action === 'save') return res.json({ request, match: null });
  if (action === 'skip') return res.json({ request, match: null });

  res.json({ request, match: null });
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function profileFor(userId, mentorProfiles, learnerProfiles) {
  return mentorProfiles.find((profile) => profile.userId === userId)
    || learnerProfiles.find((profile) => profile.userId === userId)
    || null;
}

async function createAcceptedMatch(request) {
  const [fromUser, toUser] = await Promise.all([
    findOne('users', (item) => item.id === request.fromUserId),
    findOne('users', (item) => item.id === request.toUserId)
  ]);
  if (!fromUser || !toUser) return null;
  const learner = fromUser.role === 'learner' ? fromUser : toUser;
  const mentor = fromUser.role === 'mentor' ? fromUser : toUser;
  const [learnerProfile, mentorProfile] = await Promise.all([
    findOne('learnerProfiles', (item) => item.userId === learner.id),
    findOne('mentorProfiles', (item) => item.userId === mentor.id)
  ]);
  const compatibility = calculateCompatibility(learnerProfile, mentorProfile);
  const existingMatch = await findOne('matches', (item) => item.learnerId === learner.id && item.mentorId === mentor.id);
  return existingMatch || insert('matches', { learnerId: learner.id, mentorId: mentor.id, status: 'matched', ...compatibility });
}

export async function inbox(req, res) {
  const [requests, users, mentorProfiles, learnerProfiles, messages, groupMessages, groupChats] = await Promise.all([
    list('matchRequests'),
    list('users'),
    list('mentorProfiles'),
    list('learnerProfiles'),
    list('messages'),
    list('groupChatMessages'),
    list('groupChats')
  ]);

  const incoming = requests
    .filter((request) => request.toUserId === req.user.id && request.action === 'connect' && request.status === 'pending')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (req.query.markViewed === 'true') {
    await Promise.all(incoming.filter((request) => !request.viewedAt).map((request) => update('matchRequests', request.id, { viewedAt: new Date().toISOString() })));
  }

  const unreadDirectMessages = messages.filter((message) => message.receiverId === req.user.id && !message.readAt).length;
  const userGroupIds = new Set(groupChats.filter((chat) => (chat.participantIds || []).includes(req.user.id)).map((chat) => chat.id));
  const unreadGroupMessages = groupMessages.filter((message) => userGroupIds.has(message.groupChatId) && message.senderId !== req.user.id && !(message.readBy || []).includes(req.user.id)).length;
  const unreadRequests = incoming.filter((request) => !request.viewedAt).length;

  res.json({
    unreadCount: unreadRequests + unreadDirectMessages + unreadGroupMessages,
    unreadRequests,
    unreadMessages: unreadDirectMessages + unreadGroupMessages,
    requests: incoming.map((request) => {
      const sender = users.find((user) => user.id === request.fromUserId);
      const profile = profileFor(request.fromUserId, mentorProfiles, learnerProfiles);
      return {
        ...request,
        sender: safeUser(sender),
        senderProfile: profile,
        senderSummary: profile?.bio || profile?.profession || 'BridgeUp member'
      };
    })
  });
}

export async function acceptRequest(req, res) {
  const request = await findOne('matchRequests', (item) => item.id === req.params.requestId && item.toUserId === req.user.id && item.action === 'connect');
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  if (request.status !== 'pending') return res.status(400).json({ message: 'This request has already been resolved.' });
  const match = await createAcceptedMatch(request);
  const now = new Date().toISOString();
  const updated = await update('matchRequests', request.id, { status: 'accepted', viewedAt: request.viewedAt || now, resolvedAt: now });
  const reciprocal = await findOne('matchRequests', (item) => item.fromUserId === req.user.id && item.toUserId === request.fromUserId && item.action === 'connect' && item.status === 'pending');
  if (reciprocal) await update('matchRequests', reciprocal.id, { status: 'accepted', viewedAt: reciprocal.viewedAt || now, resolvedAt: now });
  res.json({ request: updated, match });
}

export async function declineRequest(req, res) {
  const request = await findOne('matchRequests', (item) => item.id === req.params.requestId && item.toUserId === req.user.id && item.action === 'connect');
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  if (request.status !== 'pending') return res.status(400).json({ message: 'This request has already been resolved.' });
  const now = new Date().toISOString();
  const updated = await update('matchRequests', request.id, { status: 'declined', viewedAt: request.viewedAt || now, resolvedAt: now });
  res.json({ request: updated });
}

export async function matches(req, res) {
  const allMatches = await list('matches');
  const users = await list('users');
  const relevant = allMatches
    .filter((match) => match.status === 'matched' && [match.learnerId, match.mentorId].includes(req.user.id))
    .map((match) => {
      const otherId = match.learnerId === req.user.id ? match.mentorId : match.learnerId;
      const other = users.find((user) => user.id === otherId);
      return { ...match, other: other && { id: other.id, name: other.name, role: other.role } };
    });
  res.json({ matches: relevant });
}

export async function search(req, res) {
  const q = String(req.query.q || '').toLowerCase();
  const industry = String(req.query.industry || '').toLowerCase();
  const minimumCompatibility = Number(req.query.minimumCompatibility || 0);
  const sort = String(req.query.sort || 'relevant');
  const target = req.user.role === 'learner' ? 'mentorProfiles' : 'learnerProfiles';
  const profiles = await list(target);
  const users = await list('users');
  const requests = await list('matchRequests');
  const matches = await list('matches');
  const userProfile = await currentProfile(req.user);
  const outgoingPending = new Set(requests
    .filter((request) => request.fromUserId === req.user.id && request.action === 'connect' && request.status === 'pending')
    .map((request) => request.toUserId));
  const connectedIds = new Set(matches
    .filter((match) => match.status === 'matched' && [match.learnerId, match.mentorId].includes(req.user.id))
    .map((match) => match.learnerId === req.user.id ? match.mentorId : match.learnerId));
  const intentTerms = expandSearch(q);
  const results = profiles.map((profile) => {
    const user = users.find((item) => item.id === profile.userId);
    const haystack = [
      user?.name,
      profile.profession,
      profile.bio,
      profile.mentorshipStyle,
      ...(profile.industries || []),
      ...(profile.skills || []),
      ...(profile.topics || []),
      ...(profile.languages || []),
      ...(profile.availability || []),
      ...(profile.goals || [])
    ].join(' ').toLowerCase();
    const relevance = intentTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
    const compatibility = userProfile
      ? req.user.role === 'learner'
        ? calculateCompatibility(userProfile, profile)
        : calculateCompatibility(profile, userProfile)
      : { score: 70, explanation: 'Search result based on your interests.' };
    return {
      profile,
      user: user && { id: user.id, name: user.name, role: user.role },
      compatibility,
      relevance,
      requestStatus: outgoingPending.has(profile.userId) ? 'pending' : connectedIds.has(profile.userId) ? 'connected' : 'none'
    };
  }).filter((item) => {
    const industryOk = !industry || (item.profile.industries || []).join(' ').toLowerCase().includes(industry);
    const queryOk = !q || item.relevance > 0;
    return item.user && industryOk && queryOk && item.compatibility.score >= minimumCompatibility;
  });

  results.sort((a, b) => {
    if (sort === 'match') return b.compatibility.score - a.compatibility.score;
    if (sort === 'experienced') return (b.profile.yearsExperience || 0) - (a.profile.yearsExperience || 0);
    if (sort === 'newest') return String(b.profile.createdAt || '').localeCompare(String(a.profile.createdAt || ''));
    if (sort === 'rated') return 4.9 - 4.8;
    return (b.relevance - a.relevance) || (b.compatibility.score - a.compatibility.score);
  });
  res.json({ results });
}

function expandSearch(query) {
  const terms = new Set(String(query || '').toLowerCase().split(/\s+/).filter(Boolean));
  const text = String(query || '').toLowerCase();
  const groups = [
    { match: ['interview', 'interviews', 'job'], add: ['interview confidence', 'career guidance', 'communication', 'workplace communication', 'banking'] },
    { match: ['finance', 'financial', 'bank', 'banking', 'investment'], add: ['finance', 'banking', 'financial planning', 'career guidance', 'dbs'] },
    { match: ['lead', 'leader', 'leadership', 'manager'], add: ['leadership', 'people management', 'confidence'] },
    { match: ['tech', 'technology', 'startup', 'entrepreneur'], add: ['technology', 'startups', 'entrepreneurship', 'portfolio review'] },
    { match: ['english', 'mandarin', 'malay', 'tamil'], add: ['english', 'mandarin', 'malay', 'tamil'] }
  ];
  groups.forEach((group) => {
    if (group.match.some((word) => text.includes(word))) group.add.forEach((term) => terms.add(term));
  });
  return Array.from(terms);
}
