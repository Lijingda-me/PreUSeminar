import { Router } from 'express';
import { adminBanList, adminBanUser, adminCloseReport, adminMessageReport, adminReports, adminUnbanUser, blockUser, contactSupport, reportGroup, reportUser, settings, updateSettings } from '../controllers/safetyController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const safetyRoutes = Router();

safetyRoutes.post('/reports', requireAuth, reportUser);
safetyRoutes.post('/reports/group/:groupId', requireAuth, reportGroup);
safetyRoutes.post('/contact', requireAuth, contactSupport);
safetyRoutes.get('/admin/reports', requireAuth, requireRole('admin'), adminReports);
safetyRoutes.get('/admin/bans', requireAuth, requireRole('admin'), adminBanList);
safetyRoutes.post('/admin/reports/:reportId/messages', requireAuth, requireRole('admin'), adminMessageReport);
safetyRoutes.patch('/admin/reports/:reportId', requireAuth, requireRole('admin'), adminCloseReport);
safetyRoutes.post('/admin/ban/:userId', requireAuth, requireRole('admin'), adminBanUser);
safetyRoutes.post('/admin/unban/:userId', requireAuth, requireRole('admin'), adminUnbanUser);
safetyRoutes.post('/block/:userId', requireAuth, blockUser);
safetyRoutes.get('/settings', requireAuth, settings);
safetyRoutes.patch('/settings', requireAuth, updateSettings);
