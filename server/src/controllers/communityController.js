import { insert, list, update, findOne, remove } from '../services/fileStore.js';

export async function groups(_req, res) {
  res.json({ groups: await list('groups') });
}

function groupOwner(group) {
  return group.ownerId || group.members?.filter(Boolean)?.[0] || null;
}

function isMember(group, userId) {
  return (group.members || []).includes(userId) || groupOwner(group) === userId;
}

function canModerate(group, userId) {
  return groupOwner(group) === userId || (group.moderators || []).includes(userId);
}

export async function createGroup(req, res) {
  const group = await insert('groups', {
    name: req.body.name,
    topic: req.body.topic,
    description: req.body.description,
    ownerId: req.user.id,
    moderators: [],
    members: [req.user.id]
  });
  res.status(201).json({ group });
}

export async function groupDetail(req, res) {
  const [group, messages, users] = await Promise.all([
    findOne('groups', (item) => item.id === req.params.id),
    list('groupMessages'),
    list('users')
  ]);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  const safeUsers = users.map((user) => ({ id: user.id, name: user.name, role: user.role, status: user.status }));
  const ownerId = groupOwner(group);
  const moderators = group.moderators || [];
  const memberIds = group.members || [];
  const mayViewMembers = ownerId === req.user.id || moderators.includes(req.user.id);
  res.json({
    group: { ...group, ownerId, moderators, members: memberIds, memberCount: memberIds.length },
    members: mayViewMembers ? safeUsers.filter((user) => memberIds.includes(user.id)) : [],
    messages: messages
      .filter((message) => message.groupId === group.id)
      .map((message) => ({ ...message, sender: safeUsers.find((user) => user.id === message.senderId) }))
  });
}

export async function joinGroup(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  const ownerId = groupOwner(group) || req.user.id;
  const members = Array.from(new Set([ownerId, ...(group.members || []).filter(Boolean), req.user.id]));
  res.json({ group: await update('groups', group.id, { members, ownerId, moderators: group.moderators || [] }) });
}

export async function leaveGroup(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  const ownerId = groupOwner(group);
  if (ownerId === req.user.id && !req.body.newOwnerId) return res.status(400).json({ message: 'Choose a new owner before leaving.' });
  if (ownerId === req.user.id && !(group.members || []).includes(req.body.newOwnerId)) return res.status(400).json({ message: 'New owner must be a group member.' });
  const members = (group.members || []).filter((id) => id !== req.user.id);
  const moderators = (group.moderators || []).filter((id) => id !== req.user.id);
  const nextOwner = ownerId === req.user.id ? req.body.newOwnerId : ownerId;
  res.json({ group: await update('groups', group.id, { members: Array.from(new Set([nextOwner, ...members])), moderators, ownerId: nextOwner }) });
}

export async function deleteGroup(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (req.user.role !== 'admin' && groupOwner(group) !== req.user.id) return res.status(403).json({ message: 'Only the owner or an admin can delete this group.' });
  const messages = await list('groupMessages');
  await Promise.all(messages.filter((message) => message.groupId === group.id).map((message) => remove('groupMessages', message.id)));
  await remove('groups', group.id);
  res.json({ ok: true });
}

export async function grantModerator(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (groupOwner(group) !== req.user.id) return res.status(403).json({ message: 'Only the owner can grant moderator tools.' });
  if (!(group.members || []).includes(req.body.userId)) return res.status(400).json({ message: 'Moderator must be a group member.' });
  const moderators = Array.from(new Set([...(group.moderators || []), req.body.userId]));
  res.json({ group: await update('groups', group.id, { moderators }) });
}

export async function createGroupMessage(req, res) {
  const group = await findOne('groups', (item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (!isMember(group, req.user.id)) return res.status(403).json({ message: 'Join the group before messaging.' });
  const message = await insert('groupMessages', {
    groupId: group.id,
    senderId: req.user.id,
    body: req.body.body,
    replyToId: req.body.replyToId || null,
    forwarded: Boolean(req.body.forwarded),
    forwardedFromId: req.body.forwardedFromId || null,
    pinned: false,
    deliveredAt: new Date().toISOString(),
    edited: false,
    deleted: false
  });
  res.status(201).json({ message });
}

export async function pinGroupMessage(req, res) {
  const message = await findOne('groupMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const group = await findOne('groups', (item) => item.id === message.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  if (!isMember(group, req.user.id)) return res.status(403).json({ message: 'Join the group before pinning messages.' });
  res.json({ message: await update('groupMessages', message.id, { pinned: Boolean(req.body.pinned), pinnedBy: req.user.id, pinnedAt: new Date().toISOString() }) });
}

export async function editGroupMessage(req, res) {
  const message = await findOne('groupMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own messages.' });
  res.json({ message: await update('groupMessages', message.id, { body: req.body.body, edited: true }) });
}

export async function deleteGroupMessage(req, res) {
  const message = await findOne('groupMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const group = await findOne('groups', (item) => item.id === message.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found.' });
  const selfDelete = message.senderId === req.user.id;
  if (!selfDelete && !canModerate(group, req.user.id)) return res.status(403).json({ message: 'Only moderators or owners can delete others messages.' });
  const deleter = req.user.name;
  const users = await list('users');
  const sender = users.find((user) => user.id === message.senderId);
  const deletedNotice = selfDelete ? `${sender?.name || 'Someone'} deleted their message` : `${deleter} deleted ${sender?.name || 'a member'}'s message`;
  res.json({ message: await update('groupMessages', message.id, { body: '', deleted: true, deletedBy: req.user.id, deletedNotice }) });
}

export async function workshops(_req, res) {
  res.json({ workshops: await list('workshops'), events: await list('events') });
}

export async function schedule(_req, res) {
  const [workshopsList, eventsList] = await Promise.all([list('workshops'), list('events')]);
  res.json({
    schedule: [
      ...workshopsList.map((item) => ({ ...item, type: 'workshop' })),
      ...eventsList.map((item) => ({ ...item, type: 'event' }))
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  });
}

export async function createWorkshop(req, res) {
  const workshop = await insert('workshops', { ...req.body, hostId: req.user.id, attendees: [] });
  res.status(201).json({ workshop });
}

export async function createEvent(req, res) {
  const event = await insert('events', { ...req.body, createdBy: req.user.id, attendees: [] });
  res.status(201).json({ event });
}

export async function deleteWorkshop(req, res) {
  const workshop = await findOne('workshops', (item) => item.id === req.params.id);
  if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });
  await remove('workshops', workshop.id);
  res.json({ ok: true });
}

export async function deleteEvent(req, res) {
  const event = await findOne('events', (item) => item.id === req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  await remove('events', event.id);
  res.json({ ok: true });
}

export async function attendWorkshop(req, res) {
  const workshop = await findOne('workshops', (item) => item.id === req.params.id);
  if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });
  const attendees = Array.from(new Set([...(workshop.attendees || []), req.user.id]));
  res.json({ workshop: await update('workshops', workshop.id, { attendees }) });
}
