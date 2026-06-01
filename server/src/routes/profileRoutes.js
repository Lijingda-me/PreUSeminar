import { Router } from 'express';
import { adminFullProfile, adminOverview, adminUsers, getProfile, saveOnboarding, saveProfile, updateProfile } from '../controllers/profileController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const profileRoutes = Router();

profileRoutes.post('/onboarding', requireAuth, saveOnboarding);
profileRoutes.get('/me', requireAuth, getProfile);
profileRoutes.patch('/me', requireAuth, updateProfile);
profileRoutes.post('/save/:userId', requireAuth, saveProfile);
profileRoutes.get('/admin/overview', requireAuth, requireRole('admin'), adminOverview);
profileRoutes.get('/admin/full/:userId', requireAuth, requireRole('admin'), adminFullProfile);
profileRoutes.get('/admin/users', requireAuth, requireRole('admin'), adminUsers);
profileRoutes.get('/:userId', requireAuth, getProfile);
