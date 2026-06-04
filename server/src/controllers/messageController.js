import { findOne, insert, list, remove, update } from '../services/fileStore.js';
import { callEvents, emitCallEvent } from '../services/callEvents.js';
import { verifyToken } from '../utils/auth.js';

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
  const chatMessages = (await list('messages')).filter((item) => item.matchId === match.id);
  const unreadMessageIds = chatMessages
    .filter((message) => message.receiverId === req.user.id && !message.readAt)
    .map((message) => message.id);
  const now = new Date().toISOString();
  await Promise.all(chatMessages
    .filter((message) => message.receiverId === req.user.id && !message.readAt)
    .map((message) => update('messages', message.id, { readAt: now })));
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
    unreadMessageIds,
    messages: messages.map((message) => decorateMessage(message, context)),
    calls: await callsForScope('match', match.id, req.user.id)
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

async function chatScopeForUser(userId, scopeType, scopeId) {
  if (scopeType === 'match') {
    const match = await canUseMatch(userId, scopeId);
    if (!match) return null;
    return { scopeType, scopeId: match.id, participantIds: [match.learnerId, match.mentorId], title: 'Mentorship chat' };
  }
  if (scopeType === 'group') {
    const chat = await findOne('groupChats', (item) => item.id === scopeId && (item.participantIds || []).includes(userId));
    if (!chat) return null;
    return { scopeType, scopeId: chat.id, participantIds: chat.participantIds || [], title: chat.name || 'WeMentor group chat' };
  }
  return null;
}

function callDuration(call) {
  if (call.durationSeconds) return call.durationSeconds;
  if (!call.acceptedAt || !call.endedAt) return 0;
  return Math.max(0, Math.round((new Date(call.endedAt).getTime() - new Date(call.acceptedAt).getTime()) / 1000));
}

function publicCall(call, users = []) {
  const caller = safeUser(users.find((user) => user.id === call.callerId));
  return {
    ...call,
    caller,
    durationSeconds: callDuration(call),
    recording: call.recording ? {
      status: call.recording.status,
      filename: call.recording.filename,
      mimeType: call.recording.mimeType
    } : { status: call.status === 'completed' ? 'processing' : 'none' }
  };
}

async function callsForScope(scopeType, scopeId, userId) {
  const calls = await list('callSessions');
  const users = await list('users');
  return calls
    .filter((call) => call.scopeType === scopeType && call.scopeId === scopeId && (call.participantIds || []).includes(userId))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((call) => publicCall(call, users));
}

export async function activeCalls(req, res) {
  const calls = (await list('callSessions'))
    .filter((call) => (call.participantIds || []).includes(req.user.id) && ['ringing', 'connected'].includes(call.status));
  const users = await list('users');
  res.json({ calls: calls.map((call) => publicCall(call, users)) });
}

export async function callStream(req, res) {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  let user;
  try {
    const payload = verifyToken(token);
    user = await findOne('users', (item) => item.id === payload.sub && item.status !== 'removed');
  } catch {
    return res.status(401).json({ message: 'Invalid session.' });
  }
  if (!user) return res.status(401).json({ message: 'Invalid session.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write('retry: 10000\n\n');

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  const heartbeat = setInterval(() => send({ event: 'heartbeat' }), 25000);
  const listener = (payload) => send(payload);
  callEvents.on(`call:${user.id}`, listener);
  send({ event: 'connected' });

  req.on('close', () => {
    clearInterval(heartbeat);
    callEvents.off(`call:${user.id}`, listener);
    res.end();
  });
}

export async function startCall(req, res) {
  const scope = await chatScopeForUser(req.user.id, req.body.scopeType, req.body.scopeId);
  if (!scope) return res.status(403).json({ message: 'Calls are only available inside your chats.' });
  if (!['voice', 'video'].includes(req.body.callType)) return res.status(400).json({ message: 'Choose voice or video call.' });
  const existing = (await list('callSessions')).find((call) =>
    call.scopeType === scope.scopeType
    && call.scopeId === scope.scopeId
    && ['ringing', 'connected'].includes(call.status)
  );
  if (existing) return res.status(409).json({ message: 'A call is already active in this chat.' });
  const call = await insert('callSessions', {
    scopeType: scope.scopeType,
    scopeId: scope.scopeId,
    callType: req.body.callType,
    callerId: req.user.id,
    participantIds: Array.from(new Set(scope.participantIds)),
    status: 'ringing',
    acceptedBy: [],
    declinedBy: [],
    startedAt: new Date().toISOString(),
    acceptedAt: null,
    endedAt: null,
    durationSeconds: 0,
    signals: [],
    recording: { status: 'none' }
  });
  const users = await list('users');
  const decorated = publicCall(call, users);
  emitCallEvent(call, 'call:start', { call: decorated });
  res.status(201).json({ call: decorated });
}

export async function acceptCall(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  if (!['ringing', 'connected'].includes(call.status)) return res.status(400).json({ message: 'This call is no longer active.' });
  const now = new Date().toISOString();
  const acceptedBy = Array.from(new Set([...(call.acceptedBy || []), req.user.id]));
  const updated = await update('callSessions', call.id, {
    status: 'connected',
    acceptedBy,
    acceptedAt: call.acceptedAt || now,
    recording: call.recording?.status === 'none' ? { status: 'processing' } : call.recording
  });
  const users = await list('users');
  const decorated = publicCall(updated, users);
  emitCallEvent(updated, 'call:accept', { call: decorated });
  res.json({ call: decorated });
}

export async function declineCall(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  const status = call.callerId === req.user.id ? 'missed' : 'declined';
  const updated = await update('callSessions', call.id, {
    status,
    declinedBy: Array.from(new Set([...(call.declinedBy || []), req.user.id])),
    endedAt: new Date().toISOString(),
    durationSeconds: 0,
    recording: { status: 'none' }
  });
  const users = await list('users');
  const decorated = publicCall(updated, users);
  emitCallEvent(updated, 'call:decline', { call: decorated });
  res.json({ call: decorated });
}

export async function endCall(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  const now = new Date().toISOString();
  const completed = call.status === 'connected';
  const updated = await update('callSessions', call.id, {
    status: completed ? 'completed' : 'missed',
    endedAt: now,
    durationSeconds: completed ? callDuration({ ...call, endedAt: now }) : 0,
    recording: completed ? { ...(call.recording || {}), status: call.recording?.status === 'ready' ? 'ready' : 'processing' } : { status: 'none' }
  });
  const users = await list('users');
  const decorated = publicCall(updated, users);
  emitCallEvent(updated, 'call:end', { call: decorated });
  res.json({ call: decorated });
}

export async function sendCallSignal(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  const signal = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fromUserId: req.user.id,
    type: req.body.type,
    payload: req.body.payload,
    createdAt: new Date().toISOString()
  };
  const updated = await update('callSessions', call.id, { signals: [...(call.signals || []), signal] });
  emitCallEvent(updated, 'call:signal', { signal, signalCount: updated.signals.length });
  res.status(201).json({ signal, signalCount: updated.signals.length });
}

export async function callSignals(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  const since = Number(req.query.since || 0);
  const signals = (call.signals || []).slice(since).filter((signal) => signal.fromUserId !== req.user.id);
  res.json({ signals, next: call.signals?.length || 0 });
}

export async function uploadCallRecording(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Call not found.' });
  if (!['completed', 'ended'].includes(call.status)) return res.status(400).json({ message: 'Recordings are only saved after a call ends.' });
  const dataUrl = String(req.body.dataUrl || '');
  if (!dataUrl.startsWith('data:')) return res.status(400).json({ message: 'Recording data is missing.' });
  const mimeType = req.body.mimeType || dataUrl.slice(5, dataUrl.indexOf(';')) || 'video/webm';
  const extension = mimeType.includes('audio') ? 'webm' : 'webm';
  const updated = await update('callSessions', call.id, {
    recording: {
      status: 'ready',
      mimeType,
      dataUrl,
      filename: `bridgeup-${call.callType}-call-${call.id}.${extension}`,
      savedBy: req.user.id,
      savedAt: new Date().toISOString()
    }
  });
  const users = await list('users');
  const decorated = publicCall(updated, users);
  emitCallEvent(updated, 'call:recording', { call: decorated });
  res.json({ call: decorated });
}

export async function downloadCallRecording(req, res) {
  const call = await findOne('callSessions', (item) => item.id === req.params.callId && (item.participantIds || []).includes(req.user.id));
  if (!call) return res.status(404).json({ message: 'Recording not found.' });
  if (call.recording?.status !== 'ready' || !call.recording.dataUrl) return res.status(404).json({ message: 'Recording is not ready yet.' });
  const [, meta, data] = call.recording.dataUrl.match(/^data:(.+);base64,(.+)$/) || [];
  if (!data) return res.status(500).json({ message: 'Recording could not be read.' });
  const buffer = Buffer.from(data, 'base64');
  res.setHeader('Content-Type', meta || call.recording.mimeType || 'video/webm');
  res.setHeader('Content-Disposition', `attachment; filename="${call.recording.filename || 'bridgeup-call.webm'}"`);
  res.send(buffer);
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
  const groupMessages = await list('groupChatMessages');
  const context = await messageContext();
  res.json({
    chats: chats.map((chat) => ({
      ...chat,
      unreadCount: groupMessages.filter((message) =>
        message.groupChatId === chat.id
        && message.senderId !== req.user.id
        && !(message.readBy || []).includes(req.user.id)
      ).length,
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
    name: req.body.name || 'WeMentor group chat',
    about: req.body.about || 'A private group chat for connected WeMentor members.',
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
  const chatMessages = (await list('groupChatMessages')).filter((message) => message.groupChatId === chat.id);
  const unreadMessageIds = chatMessages
    .filter((message) => message.senderId !== req.user.id && !(message.readBy || []).includes(req.user.id))
    .map((message) => message.id);
  await Promise.all(chatMessages
    .filter((message) => message.senderId !== req.user.id && !(message.readBy || []).includes(req.user.id))
    .map((message) => update('groupChatMessages', message.id, { readBy: Array.from(new Set([...(message.readBy || []), req.user.id])) })));
  const messages = (await list('groupChatMessages')).filter((message) => message.groupChatId === chat.id);
  const participants = context.users
    .filter((user) => (chat.participantIds || []).includes(user.id))
    .map((user) => decorateParticipant(user, context.mentorProfiles, context.learnerProfiles, chat));
  res.json({
    chat,
    participants,
    unreadMessageIds,
    messages: messages.map((message) => decorateMessage(message, context)),
    calls: await callsForScope('group', chat.id, req.user.id)
  });
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
