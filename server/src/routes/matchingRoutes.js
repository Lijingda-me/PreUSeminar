import { Router } from 'express';
import { candidates, matches, search, swipe } from '../controllers/matchingController.js';
import { requireAuth } from '../middleware/auth.js';

export const matchingRoutes = Router();

matchingRoutes.get('/candidates', requireAuth, candidates);
matchingRoutes.post('/swipe', requireAuth, swipe);
matchingRoutes.get('/matches', requireAuth, matches);
matchingRoutes.get('/search', requireAuth, search);
