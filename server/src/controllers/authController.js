import bcrypt from 'bcryptjs';
import { findOne, insert, update } from '../services/fileStore.js';
import { publicUser, signToken } from '../utils/auth.js';
import { banIsActive } from '../utils/ban.js';

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !['learner', 'mentor', 'admin', 'staff'].includes(role)) {
    return res.status(400).json({ message: 'Name, email, password, and valid role are required.' });
  }

  const existing = await findOne('users', (item) => item.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ message: 'This email is already registered.' });

  const user = await insert('users', {
    name,
    email: email.toLowerCase(),
    role,
    passwordHash: await bcrypt.hash(password, 10),
    onboarded: false,
    blockedUsers: [],
    savedProfiles: [],
    status: 'active'
  });
  await insert('userSettings', { userId: user.id, largerText: false, reduceMotion: false, highContrast: false, language: 'English', notifications: true });

  res.status(201).json({ user: publicUser(user), token: signToken(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await findOne('users', (item) => item.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (banIsActive(user)) {
    const until = user.banUntil ? ` Until: ${new Date(user.banUntil).toLocaleDateString('en-SG')}.` : '';
    return res.status(403).json({ message: `This account is banned. Reason: ${user.banReason || 'Community safety action.'}.${until}` });
  }
  if (user.status === 'banned' && !banIsActive(user)) {
    const reactivated = await update('users', user.id, { status: 'active', banExpiredAt: new Date().toISOString() });
    return res.json({ user: publicUser(reactivated), token: signToken(reactivated) });
  }

  res.json({ user: publicUser(user), token: signToken(user) });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
