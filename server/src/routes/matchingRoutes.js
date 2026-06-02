import { Router } from 'express';
import { acceptRequest, candidates, declineRequest, inbox, matches, search, swipe } from '../controllers/matchingController.js';
import { requireAuth } from '../middleware/auth.js';

export const matchingRoutes = Router();

matchingRoutes.get('/candidates', requireAuth, candidates);
matchingRoutes.post('/swipe', requireAuth, swipe);
matchingRoutes.get('/inbox', requireAuth, inbox);
matchingRoutes.post('/requests/:requestId/accept', requireAuth, acceptRequest);
matchingRoutes.post('/requests/:requestId/decline', requireAuth, declineRequest);
matchingRoutes.get('/matches', requireAuth, matches);
matchingRoutes.get('/search', requireAuth, search);
