import { Router } from 'express';
import { attendWorkshop, createEvent, createGroup, createGroupMessage, createWorkshop, deleteEvent, deleteGroup, deleteGroupMessage, deleteWorkshop, editGroupMessage, grantModerator, groupDetail, groups, joinGroup, leaveGroup, pinGroupMessage, schedule, workshops } from '../controllers/communityController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const communityRoutes = Router();

communityRoutes.get('/groups', requireAuth, groups);
communityRoutes.post('/groups', requireAuth, createGroup);
communityRoutes.get('/groups/:id', requireAuth, groupDetail);
communityRoutes.post('/groups/:id/join', requireAuth, joinGroup);
communityRoutes.post('/groups/:id/leave', requireAuth, leaveGroup);
communityRoutes.delete('/groups/:id', requireAuth, deleteGroup);
communityRoutes.post('/groups/:id/moderators', requireAuth, grantModerator);
communityRoutes.post('/groups/:id/messages', requireAuth, createGroupMessage);
communityRoutes.patch('/groups/messages/:messageId', requireAuth, editGroupMessage);
communityRoutes.delete('/groups/messages/:messageId', requireAuth, deleteGroupMessage);
communityRoutes.patch('/groups/messages/:messageId/pin', requireAuth, pinGroupMessage);
communityRoutes.get('/workshops', requireAuth, workshops);
communityRoutes.get('/schedule', requireAuth, requireRole('staff', 'admin'), schedule);
communityRoutes.post('/workshops', requireAuth, requireRole('mentor', 'staff', 'admin'), createWorkshop);
communityRoutes.post('/events', requireAuth, requireRole('staff', 'admin'), createEvent);
communityRoutes.delete('/workshops/:id', requireAuth, requireRole('staff', 'admin'), deleteWorkshop);
communityRoutes.delete('/events/:id', requireAuth, requireRole('staff', 'admin'), deleteEvent);
communityRoutes.post('/workshops/:id/attend', requireAuth, attendWorkshop);
