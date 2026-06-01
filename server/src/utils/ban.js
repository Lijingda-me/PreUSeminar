export const banDurations = [1, 3, 7, 14, 30, 90, 180, 365];

export function banIsActive(user) {
  if (user.status !== 'banned') return false;
  if (!user.banUntil) return true;
  return new Date(user.banUntil).getTime() > Date.now();
}

export function banExpiryFor(durationDays) {
  if (durationDays === undefined || durationDays === null || durationDays === '' || durationDays === 'permanent') return null;
  const days = Number(durationDays);
  if (!banDurations.includes(days)) {
    const allowed = banDurations.join(', ');
    const error = new Error(`Ban duration must be one of: ${allowed} days.`);
    error.status = 400;
    throw error;
  }
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
