import { findOne, insert, list, remove, update } from '../services/fileStore.js';

async function canUseMatch(userId, matchId) {
  const match = await findOne('matches', (item) => item.id === matchId && item.status === 'matched');
  return match && [match.learnerId, match.mentorId].includes(userId) ? match : null;
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

function roleInChat(userId, chat) {
  if (chat?.ownerId === userId) return 'owner';
  if ((chat?.moderators || []).includes(userId)) return 'moderator';
  return 'member';
}

function decorateParticipant(user, mentorProfiles, learnerProfiles, chat = null) {
  const publicUser = safeUser(user);
  if (!publicUser) return null;
  const profile = profileFor(publicUser.id, mentorProfiles, learnerProfiles);
  return { ...publicUser, profile, photo: profile?.photo || null, groupRole: chat ? roleInChat(publicUser.id, chat) : undefined };
}

async function messageContext() {
  const [users, mentorProfiles, learnerProfiles] = await Promise.all([
    list('users'),
    list('mentorProfiles'),
    list('learnerProfiles')
  ]);
  return { users, mentorProfiles, learnerProfiles };
}

function decorateMessage(message, context) {
  const sender = context.users.find((user) => user.id === message.senderId);
  return {
    ...message,
    sender: safeUser(sender),
    senderProfile: profileFor(message.senderId, context.mentorProfiles, context.learnerProfiles)
  };
}

export async function getMessages(req, res) {
  const match = await canUseMatch(req.user.id, req.params.matchId);
  if (!match) return res.status(403).json({ message: 'Messages are only available for mutual matches.' });
  const context = await messageContext();
  const messages = (await list('messages')).filter((item) => item.matchId === match.id);
  const participantIds = [match.learnerId, match.mentorId];
  const participants = context.users
    .filter((user) => participantIds.includes(user.id))
    .map((user) => decorateParticipant(user, context.mentorProfiles, context.learnerProfiles));
  const otherId = match.learnerId === req.user.id ? match.mentorId : match.learnerId;
  res.json({
    match,
    other: participants.find((participant) => participant.id === otherId) || null,
    participants,
    messages: messages.map((message) => decorateMessage(message, context))
  });
}

export async function sendMessage(req, res) {
  const match = await canUseMatch(req.user.id, req.params.matchId);
  if (!match) return res.status(403).json({ message: 'Messages are only available for mutual matches.' });
  const receiverId = match.learnerId === req.user.id ? match.mentorId : match.learnerId;
  const now = new Date().toISOString();
  const message = await insert('messages', {
    matchId: match.id,
    senderId: req.user.id,
    receiverId,
    body: req.body.body,
    replyToId: req.body.replyToId || null,
    forwarded: Boolean(req.body.forwarded),
    forwardedFromId: req.body.forwardedFromId || null,
    pinned: false,
    deliveredAt: now,
    readAt: null
  });
  const context = await messageContext();
  res.status(201).json({ message: decorateMessage(message, context) });
}

export async function pinMessage(req, res) {
  const message = await findOne('messages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const match = await canUseMatch(req.user.id, message.matchId);
  if (!match) return res.status(403).json({ message: 'Messages are only available for mutual matches.' });
  const updated = await update('messages', message.id, { pinned: Boolean(req.body.pinned), pinnedBy: req.user.id, pinnedAt: new Date().toISOString() });
  const context = await messageContext();
  res.json({ message: decorateMessage(updated, context) });
}

export async function editMessage(req, res) {
  const message = await findOne('messages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const match = await canUseMatch(req.user.id, message.matchId);
  if (!match) return res.status(403).json({ message: 'Messages are only available for mutual matches.' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own messages.' });
  const updated = await update('messages', message.id, { body: req.body.body, edited: true });
  const context = await messageContext();
  res.json({ message: decorateMessage(updated, context) });
}

export async function deleteMessage(req, res) {
  const message = await findOne('messages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const match = await canUseMatch(req.user.id, message.matchId);
  if (!match) return res.status(403).json({ message: 'Messages are only available for mutual matches.' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'You can only delete your own messages.' });
  const updated = await update('messages', message.id, { body: '', deleted: true, deletedBy: req.user.id, deletedNotice: `${req.user.name} deleted their message` });
  const context = await messageContext();
  res.json({ message: decorateMessage(updated, context) });
}

async function connectedUserIds(userId) {
  const matches = await list('matches');
  return matches
    .filter((match) => match.status === 'matched' && [match.learnerId, match.mentorId].includes(userId))
    .map((match) => match.learnerId === userId ? match.mentorId : match.learnerId);
}

export async function connectedPeople(req, res) {
  const ids = await connectedUserIds(req.user.id);
  const context = await messageContext();
  res.json({
    people: context.users
      .filter((user) => ids.includes(user.id))
      .map((user) => decorateParticipant(user, context.mentorProfiles, context.learnerProfiles))
  });
}

export async function listGroupChats(req, res) {
  const chats = (await list('groupChats')).filter((chat) => (chat.participantIds || []).includes(req.user.id));
  const context = await messageContext();
  res.json({
    chats: chats.map((chat) => ({
      ...chat,
      participants: context.users
        .filter((user) => (chat.participantIds || []).includes(user.id))
        .map((user) => decorateParticipant(user, context.mentorProfiles, context.learnerProfiles, chat))
    }))
  });
}

export async function createGroupChat(req, res) {
  const participantIds = Array.from(new Set([req.user.id, ...(req.body.participantIds || [])]));
  const connected = await connectedUserIds(req.user.id);
  const invalid = participantIds.filter((id) => id !== req.user.id && !connected.includes(id));
  if (invalid.length) return res.status(403).json({ message: 'Group chats can only include connected matches.' });
  if (participantIds.length < 2) return res.status(400).json({ message: 'Choose at least one connected person.' });
  const chat = await insert('groupChats', {
    name: req.body.name || 'BridgeUp group chat',
    about: req.body.about || 'A private group chat for connected BridgeUp members.',
    ownerId: req.user.id,
    moderators: [],
    participantIds
  });
  res.status(201).json({ chat });
}

function canManageAbout(userId, chat) {
  return chat.ownerId === userId || (chat.moderators || []).includes(userId);
}

export async function updateGroupChat(req, res) {
  const chat = await findOne('groupChats', (item) => item.id === req.params.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  if (!canManageAbout(req.user.id, chat)) return res.status(403).json({ message: 'Only owners and moderators can edit the group about page.' });
  const about = typeof req.body.about === 'string' ? req.body.about.trim() : '';
  if (!about) return res.status(400).json({ message: 'About cannot be empty.' });
  const updated = await update('groupChats', chat.id, { about });
  res.json({ chat: updated });
}

export async function toggleGroupModerator(req, res) {
  const chat = await findOne('groupChats', (item) => item.id === req.params.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  if (chat.ownerId !== req.user.id) return res.status(403).json({ message: 'Only the owner can promote or demote moderators.' });
  const targetId = req.params.userId;
  if (targetId === chat.ownerId) return res.status(400).json({ message: 'The owner already has all moderator tools.' });
  if (!(chat.participantIds || []).includes(targetId)) return res.status(404).json({ message: 'This person is not in the group chat.' });
  const moderators = new Set(chat.moderators || []);
  const promoted = !moderators.has(targetId);
  if (promoted) moderators.add(targetId);
  else moderators.delete(targetId);
  const updated = await update('groupChats', chat.id, { moderators: Array.from(moderators) });
  res.json({ chat: updated, promoted });
}

export async function leaveGroupChat(req, res) {
  const chat = await findOne('groupChats', (item) => item.id === req.params.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  const participantIds = (chat.participantIds || []).filter((id) => id !== req.user.id);
  if (!participantIds.length) {
    await remove('groupChats', chat.id);
    return res.json({ left: true, deleted: true });
  }
  const ownerId = chat.ownerId === req.user.id ? participantIds[0] : chat.ownerId;
  const moderators = (chat.moderators || []).filter((id) => id !== req.user.id && id !== ownerId && participantIds.includes(id));
  const updated = await update('groupChats', chat.id, { participantIds, moderators, ownerId });
  res.json({ left: true, chat: updated });
}

export async function getGroupChatMessages(req, res) {
  const chat = await findOne('groupChats', (item) => item.id === req.params.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  const context = await messageContext();
  const messages = (await list('groupChatMessages')).filter((message) => message.groupChatId === chat.id);
  const participants = context.users
    .filter((user) => (chat.participantIds || []).includes(user.id))
    .map((user) => decorateParticipant(user, context.mentorProfiles, context.learnerProfiles, chat));
  res.json({ chat, participants, messages: messages.map((message) => decorateMessage(message, context)) });
}

export async function sendGroupChatMessage(req, res) {
  const chat = await findOne('groupChats', (item) => item.id === req.params.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  const now = new Date().toISOString();
  const message = await insert('groupChatMessages', {
    groupChatId: chat.id,
    senderId: req.user.id,
    body: req.body.body,
    replyToId: req.body.replyToId || null,
    forwarded: Boolean(req.body.forwarded),
    forwardedFromId: req.body.forwardedFromId || null,
    pinned: false,
    deliveredAt: now,
    readBy: [req.user.id]
  });
  const context = await messageContext();
  res.status(201).json({ message: decorateMessage(message, context) });
}

export async function pinGroupChatMessage(req, res) {
  const message = await findOne('groupChatMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const chat = await findOne('groupChats', (item) => item.id === message.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  const updated = await update('groupChatMessages', message.id, { pinned: Boolean(req.body.pinned), pinnedBy: req.user.id, pinnedAt: new Date().toISOString() });
  const context = await messageContext();
  res.json({ message: decorateMessage(updated, context) });
}

export async function editGroupChatMessage(req, res) {
  const message = await findOne('groupChatMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const chat = await findOne('groupChats', (item) => item.id === message.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own messages.' });
  const updated = await update('groupChatMessages', message.id, { body: req.body.body, edited: true });
  const context = await messageContext();
  res.json({ message: decorateMessage(updated, context) });
}

export async function deleteGroupChatMessage(req, res) {
  const message = await findOne('groupChatMessages', (item) => item.id === req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const chat = await findOne('groupChats', (item) => item.id === message.groupChatId && (item.participantIds || []).includes(req.user.id));
  if (!chat) return res.status(404).json({ message: 'Group chat not found.' });
  const selfDelete = message.senderId === req.user.id;
  if (!selfDelete && !canManageAbout(req.user.id, chat)) return res.status(403).json({ message: 'Only moderators or owners can delete others messages.' });
  const context = await messageContext();
  const sender = context.users.find((user) => user.id === message.senderId);
  const deletedNotice = selfDelete ? `${sender?.name || 'Someone'} deleted their message` : `${req.user.name} deleted ${sender?.name || 'a member'}'s message`;
  const updated = await update('groupChatMessages', message.id, { body: '', deleted: true, deletedBy: req.user.id, deletedNotice });
  res.json({ message: decorateMessage(updated, context) });
}
