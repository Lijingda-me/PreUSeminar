import { Router } from 'express';
import { connectedPeople, createGroupChat, deleteGroupChatMessage, deleteMessage, editGroupChatMessage, editMessage, getGroupChatMessages, getMessages, leaveGroupChat, listGroupChats, pinGroupChatMessage, pinMessage, sendGroupChatMessage, sendMessage, toggleGroupModerator, updateGroupChat } from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

export const messageRoutes = Router();

messageRoutes.get('/connected/people', requireAuth, connectedPeople);
messageRoutes.get('/group-chats', requireAuth, listGroupChats);
messageRoutes.post('/group-chats', requireAuth, createGroupChat);
messageRoutes.get('/group-chats/:groupChatId', requireAuth, getGroupChatMessages);
messageRoutes.patch('/group-chats/:groupChatId', requireAuth, updateGroupChat);
messageRoutes.post('/group-chats/:groupChatId/leave', requireAuth, leaveGroupChat);
messageRoutes.post('/group-chats/:groupChatId/moderators/:userId', requireAuth, toggleGroupModerator);
messageRoutes.patch('/group-chats/messages/:messageId', requireAuth, editGroupChatMessage);
messageRoutes.delete('/group-chats/messages/:messageId', requireAuth, deleteGroupChatMessage);
messageRoutes.patch('/group-chats/messages/:messageId/pin', requireAuth, pinGroupChatMessage);
messageRoutes.post('/group-chats/:groupChatId', requireAuth, sendGroupChatMessage);
messageRoutes.patch('/items/:messageId', requireAuth, editMessage);
messageRoutes.delete('/items/:messageId', requireAuth, deleteMessage);
messageRoutes.patch('/items/:messageId/pin', requireAuth, pinMessage);
messageRoutes.get('/:matchId', requireAuth, getMessages);
messageRoutes.post('/:matchId', requireAuth, sendMessage);
