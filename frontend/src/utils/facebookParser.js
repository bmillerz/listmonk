const UNIT_MS = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

export const parseRelativeTime = (text, now = new Date()) => {
  const t = String(text).toLowerCase();
  if (t.includes('yesterday')) {
    return new Date(now.getTime() - UNIT_MS.day);
  }
  const m = t.match(/(a|an|\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
  if (!m) {
    return now;
  }
  const n = (m[1] === 'a' || m[1] === 'an') ? 1 : parseInt(m[1], 10);
  return new Date(now.getTime() - (n * UNIT_MS[m[2]]));
};

export const splitName = (fullName) => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
};
