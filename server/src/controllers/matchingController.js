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
  const alreadyActed = new Set(swipes.filter((item) => item.fromUserId === req.user.id && ['connect', 'skip'].includes(item.action)).map((item) => item.toUserId));

  const candidates = targetProfiles
    .filter((profile) => !blocked.has(profile.userId) && !alreadyActed.has(profile.userId))
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

  const request = await insert('matchRequests', { fromUserId: req.user.id, toUserId: targetUserId, action, status: action === 'connect' ? 'pending' : 'accepted' });
  if (action === 'save') return res.json({ request, match: null });
  if (action === 'skip') return res.json({ request, match: null });

  const reciprocal = await findOne('matchRequests', (item) => item.fromUserId === targetUserId && item.toUserId === req.user.id && item.action === 'connect');
  let match = null;
  if (reciprocal || target.role === 'mentor') {
    const learner = req.user.role === 'learner' ? req.user : target;
    const mentor = req.user.role === 'mentor' ? req.user : target;
    const learnerProfile = await findOne('learnerProfiles', (item) => item.userId === learner.id);
    const mentorProfile = await findOne('mentorProfiles', (item) => item.userId === mentor.id);
    const compatibility = calculateCompatibility(learnerProfile, mentorProfile);
    const existingMatch = await findOne('matches', (item) => item.learnerId === learner.id && item.mentorId === mentor.id);
    match = existingMatch || await insert('matches', { learnerId: learner.id, mentorId: mentor.id, status: 'matched', ...compatibility });
    if (reciprocal) await update('matchRequests', reciprocal.id, { status: 'accepted' });
    await update('matchRequests', request.id, { status: 'accepted' });
  }

  res.json({ request, match });
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
  const userProfile = await currentProfile(req.user);
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
    return { profile, user: user && { id: user.id, name: user.name, role: user.role }, compatibility, relevance };
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
