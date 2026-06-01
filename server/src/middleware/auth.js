import { findOne } from '../services/fileStore.js';
import { verifyToken } from '../utils/auth.js';
import { banIsActive } from '../utils/ban.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = verifyToken(token);
    const user = await findOne('users', (item) => item.id === payload.sub && item.status !== 'removed');
    if (!user) return res.status(401).json({ message: 'Invalid session.' });
    if (banIsActive(user)) return res.status(403).json({ message: 'This account is currently banned.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access to this action.' });
    next();
  };
}
