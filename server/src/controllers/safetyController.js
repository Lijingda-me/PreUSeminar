import { findOne, insert, list, update } from '../services/fileStore.js';
import { publicUser } from '../utils/auth.js';
import { banExpiryFor, banIsActive } from '../utils/ban.js';

export async function reportUser(req, res) {
  const report = await insert('reports', {
    reporterId: req.user.id,
    reportedUserId: req.body.reportedUserId,
    targetType: 'user',
    targetId: req.body.reportedUserId,
    reason: req.body.reason,
    details: req.body.details,
    status: 'open'
  });
  res.status(201).json({ report });
}

export async function reportGroup(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  const report = await insert('reports', {
    reporterId: req.user.id,
    reportedUserId: group.ownerId,
    targetType: 'group',
    targetId: group.id,
    reason: req.body.reason,
    details: req.body.details,
    status: 'open'
  });
  res.status(201).json({ report });
}

export async function contactSupport(req, res) {
  const details = String(req.body.details || '').trim();
  if (!details) return res.status(400).json({ message: 'Tell us what you need help with.' });
  const report = await insert('reports', {
    reporterId: req.user.id,
    reportedUserId: null,
    targetType: 'contact',
    targetId: req.user.id,
    reason: 'Contact Us',
    details,
    status: 'open'
  });
  res.status(201).json({ report });
}

export async function blockUser(req, res) {
  const target = await findOne('users', (item) => item.id === req.params.userId);
  if (!target) return res.status(404).json({ message: 'User not found.' });
  const blockedUsers = Array.from(new Set([...(req.user.blockedUsers || []), target.id]));
  const user = await update('users', req.user.id, { blockedUsers });
  res.json({ user: publicUser(user) });
}

export async function settings(req, res) {
  const existing = await findOne('userSettings', (item) => item.userId === req.user.id);
  res.json({ settings: existing });
}

export async function updateSettings(req, res) {
  const existing = await findOne('userSettings', (item) => item.userId === req.user.id);
  const settings = await update('userSettings', existing.id, req.body);
  res.json({ settings });
}

export async function adminReports(_req, res) {
  const [reports, users, groups, adminMessages] = await Promise.all([
    list('reports'),
    list('users'),
    list('groups'),
    list('adminMessages')
  ]);
  const safeUser = (id) => {
    const user = users.find((item) => item.id === id);
    return user ? publicUser(user) : null;
  };
  res.json({
    reports: reports.map((report) => ({
      ...report,
      reporter: safeUser(report.reporterId),
      reportedUser: safeUser(report.reportedUserId),
      group: report.targetType === 'group' ? groups.find((group) => group.id === report.targetId) : null,
      messages: adminMessages.filter((message) => message.reportId === report.id)
    }))
  });
}

export async function adminBanList(_req, res) {
  const users = await list('users');
  const bannedUsers = [];
  for (const user of users.filter((item) => item.status === 'banned')) {
    if (banIsActive(user)) {
      bannedUsers.push(publicUser(user));
    } else {
      await update('users', user.id, { status: 'active', banExpiredAt: new Date().toISOString() });
    }
  }
  res.json({ users: bannedUsers });
}

export async function adminMessageReport(req, res) {
  const report = await findOne('reports', (item) => item.id === req.params.reportId);
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  const recipientId = req.body.recipientId;
  const allowed = [report.reporterId, report.reportedUserId].filter(Boolean);
  if (!allowed.includes(recipientId)) return res.status(400).json({ message: 'Recipient must be the reporter or reported user.' });
  const message = await insert('adminMessages', { reportId: report.id, adminId: req.user.id, recipientId, body: req.body.body });
  res.status(201).json({ message });
}

export async function adminBanUser(req, res) {
  const user = await findOne('users', (item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be banned here.' });
  let banUntil = null;
  try {
    banUntil = banExpiryFor(req.body.durationDays);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
  const banned = await update('users', user.id, {
    status: 'banned',
    banReason: req.body.reason || 'Violation of WeMentor community guidelines.',
    banDurationDays: req.body.durationDays || 'permanent',
    banUntil,
    bannedBy: req.user.id,
    bannedAt: new Date().toISOString()
  });
  res.json({ user: publicUser(banned) });
}

export async function adminUnbanUser(req, res) {
  const user = await findOne('users', (item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const unbanned = await update('users', user.id, {
    status: 'active',
    unbanReason: req.body.reason || 'Admin removed ban.',
    unbannedBy: req.user.id,
    unbannedAt: new Date().toISOString()
  });
  res.json({ user: publicUser(unbanned) });
}

export async function adminCloseReport(req, res) {
  const report = await update('reports', req.params.reportId, {
    status: req.body.status || 'closed',
    resolution: req.body.resolution || '',
    resolvedBy: req.user.id,
    resolvedAt: new Date().toISOString()
  });
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  res.json({ report });
}
