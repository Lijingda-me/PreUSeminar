import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { authRoutes } from './routes/authRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { matchingRoutes } from './routes/matchingRoutes.js';
import { messageRoutes } from './routes/messageRoutes.js';
import { communityRoutes } from './routes/communityRoutes.js';
import { safetyRoutes } from './routes/safetyRoutes.js';

await connectDatabase();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:']
    }
  }
}));
const allowedOrigins = [
  'http://localhost:5173',
  'https://pre-u-seminar.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));

app.get('/health', (_req, res) => res.json({ ok: true, name: 'BridgeUp API' }));
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/safety', safetyRoutes);
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error) next();
  });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'BridgeUp API', status: 'running' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'BridgeUp hit an unexpected error.' });
});

app.listen(env.port, () => {
  console.log(`BridgeUp API running on http://localhost:${env.port}`);
});
