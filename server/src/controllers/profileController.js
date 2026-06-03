import { findOne, insert, update, list } from '../services/fileStore.js';
import { publicUser } from '../utils/auth.js';

function collectionForRole(role) {
  return role === 'mentor' ? 'mentorProfiles' : 'learnerProfiles';
}

export async function saveOnboarding(req, res) {
  if (['admin', 'staff'].includes(req.user.role)) {
    const user = await update('users', req.user.id, { onboarded: true });
    return res.json({ user: publicUser(user), profile: null });
  }

  const collection = collectionForRole(req.user.role);
  const existing = await findOne(collection, (profile) => profile.userId === req.user.id);
  const payload = { ...req.body, userId: req.user.id };
  const profile = existing ? await update(collection, existing.id, payload) : await insert(collection, payload);
  const user = await update('users', req.user.id, { onboarded: true });
  res.json({ user: publicUser(user), profile });
}

export async function getProfile(req, res) {
  const userId = req.params.userId || req.user.id;
  const user = await findOne('users', (item) => item.id === userId);
  if (!user) return res.status(404).json({ message: 'Profile not found.' });
  if (['admin', 'staff'].includes(user.role)) return res.json({ user: publicUser(user), profile: null });
  const collection = user.role === 'mentor' ? 'mentorProfiles' : 'learnerProfiles';
  const profile = await findOne(collection, (item) => item.userId === userId);
  let requestStatus = 'none';
  if (user.id === req.user.id) {
    requestStatus = 'self';
  } else if (req.user.role === user.role || ['admin', 'staff'].includes(req.user.role)) {
    requestStatus = 'unavailable';
  } else {
    const [matches, requests] = await Promise.all([
      list('matches'),
      list('matchRequests')
    ]);
    const connected = matches.some((match) =>
      match.status === 'matched'
      && [match.learnerId, match.mentorId].includes(req.user.id)
      && [match.learnerId, match.mentorId].includes(user.id)
    );
    const pending = requests.some((request) =>
      request.action === 'connect'
      && request.status === 'pending'
      && (
        (request.fromUserId === req.user.id && request.toUserId === user.id)
        || (request.fromUserId === user.id && request.toUserId === req.user.id)
      )
    );
    requestStatus = connected ? 'connected' : pending ? 'pending' : 'none';
  }
  res.json({ user: publicUser(user), profile, requestStatus });
}

export async function updateProfile(req, res) {
  if (['admin', 'staff'].includes(req.user.role)) {
    return res.status(400).json({ message: 'This role does not use a mentorship profile.' });
  }
  const collection = collectionForRole(req.user.role);
  const existing = await findOne(collection, (profile) => profile.userId === req.user.id);
  if (!existing) return res.status(404).json({ message: 'Complete onboarding first.' });
  const profile = await update(collection, existing.id, req.body);
  res.json({ profile });
}

export async function saveProfile(req, res) {
  const savedProfiles = Array.from(new Set([...(req.user.savedProfiles || []), req.params.userId]));
  const user = await update('users', req.user.id, { savedProfiles });
  res.json({ user: publicUser(user) });
}

export async function adminUsers(_req, res) {
  const users = (await list('users')).map(publicUser);
  res.json({ users });
}

export async function adminFullProfile(req, res) {
  const [users, mentorProfiles, learnerProfiles, settings, reports] = await Promise.all([
    list('users'),
    list('mentorProfiles'),
    list('learnerProfiles'),
    list('userSettings'),
    list('reports')
  ]);
  const user = users.find((item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const profile = user.role === 'mentor'
    ? mentorProfiles.find((item) => item.userId === user.id)
    : learnerProfiles.find((item) => item.userId === user.id);
  res.json({
    user: publicUser(user),
    profile: profile || null,
    settings: settings.find((item) => item.userId === user.id) || null,
    reports: reports.filter((report) => report.reporterId === user.id || report.reportedUserId === user.id)
  });
}

export async function adminOverview(_req, res) {
  const [users, mentorProfiles, learnerProfiles, matches, reports, workshops, events, groups] = await Promise.all([
    list('users'),
    list('mentorProfiles'),
    list('learnerProfiles'),
    list('matches'),
    list('reports'),
    list('workshops'),
    list('events'),
    list('groups')
  ]);

  const safeUsers = users.map(publicUser);
  const withProfile = (user) => {
    const profile = user.role === 'mentor'
      ? mentorProfiles.find((item) => item.userId === user.id)
      : learnerProfiles.find((item) => item.userId === user.id);
    return { ...user, profile };
  };

  res.json({
    counts: {
      users: safeUsers.length,
      learners: safeUsers.filter((user) => user.role === 'learner').length,
      mentors: safeUsers.filter((user) => user.role === 'mentor').length,
      admins: safeUsers.filter((user) => user.role === 'admin').length,
      staff: safeUsers.filter((user) => user.role === 'staff').length,
      matches: matches.filter((match) => match.status === 'matched').length,
      reports: reports.filter((report) => report.status === 'open').length,
      workshops: workshops.length,
      groups: groups.length
    },
    learners: safeUsers.filter((user) => user.role === 'learner').map(withProfile),
    mentors: safeUsers.filter((user) => user.role === 'mentor').map(withProfile),
    admins: safeUsers.filter((user) => user.role === 'admin'),
    staff: safeUsers.filter((user) => user.role === 'staff'),
    reports,
    workshops,
    events,
    groups,
    matches
  });
}
