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

const HEADER_RE = /^(.+?)\s+\(https:\/\/www\.facebook\.com\/groups\/\d+\/user\/\d+\/\)\s*$/;
// Each person is anchored by a "Requested…" or "Invited by…" line. The name is the
// nearest preceding non-empty line. This works for both the old paste layout (name
// carries a /user/ URL, time glued as "Requested6 hours ago") and the new one
// (plain name, "Requested" and the time on separate lines).
const ANCHOR_RE = /^(requested|invited by)/i;
const AGO_RE = /(?:a|an|\d+)\s*(?:minute|hour|day|week|month|year)s?\s*ago|yesterday/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const LIVES_RE = /^lives in\s+(.+?)(?:\s+\(https?:\/\/|$)/i;
// Answer to the "have you visited the site" membership question. Matches both the
// old wording ("…visited it before?") and the new one ("…visited our website to see
// our free itineraries? (irelandtipsfortravellers.com)"); the answer follows inline.
const VISITED_RE = /visited (?:it before\?|our website.*?\(irelandtipsfortravellers\.com\))\s*(.*)$/i;

export const parseFacebookText = (text, now = new Date()) => {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');

  // Find each person's name line: the nearest non-empty line above a
  // "Requested…"/"Invited by…" anchor. Employer/bio lines never precede an
  // anchor, so they are excluded.
  const headerIdx = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (ANCHOR_RE.test(lines[i].trim())) {
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') {
        j -= 1;
      }
      if (j >= 0 && (headerIdx.length === 0 || headerIdx[headerIdx.length - 1] !== j)) {
        headerIdx.push(j);
      }
    }
  }

  const rows = [];
  const seen = new Set();
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  for (let h = 0; h < headerIdx.length; h += 1) {
    const start = headerIdx[h];
    const end = h + 1 < headerIdx.length ? headerIdx[h + 1] : lines.length;
    const block = lines.slice(start, end);

    const rawName = block[0].trim();
    const hm = rawName.match(HEADER_RE);
    const name = hm ? hm[1].trim() : rawName;

    let email = '';
    for (let k = 0; k < block.length; k += 1) {
      const em = block[k].match(EMAIL_RE);
      if (em) {
        email = em[0].toLowerCase();
        break;
      }
    }
    if (!email) {
      skippedNoEmail += 1;
    } else if (seen.has(email)) {
      skippedDuplicate += 1;
    } else {
      seen.add(email);

      // The request time is the first "…ago"/"yesterday" line — glued to
      // "Requested" in the old layout, on its own line in the new one. Later
      // "Joined Facebook N years ago" lines come after it, so first wins.
      const timeLine = block.find((l) => AGO_RE.test(l)) || '';
      const signupDate = parseRelativeTime(timeLine, now).toISOString();

      let location = '';
      for (let k = 0; k < block.length; k += 1) {
        const lm = block[k].trim().match(LIVES_RE);
        if (lm) {
          location = lm[1].trim();
          break;
        }
      }

      let visitedBefore = '';
      for (let k = 0; k < block.length; k += 1) {
        const vm = block[k].match(VISITED_RE);
        if (vm) {
          // Answer is inline in the old layout; on the next non-empty line in the new one.
          visitedBefore = vm[1].trim();
          for (let n = k + 1; !visitedBefore && n < block.length; n += 1) {
            visitedBefore = block[n].trim();
          }
          break;
        }
      }

      const { firstName, lastName } = splitName(name);
      rows.push({
        name, email, firstName, lastName, signupDate, location, visitedBefore,
      });
    }
  }

  return {
    rows, total: headerIdx.length, skippedNoEmail, skippedDuplicate,
  };
};

const csvCell = (val) => {
  const s = String(val === null || val === undefined ? '' : val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const toImportCsv = (rows) => {
  const out = ['email,name,attributes'];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const attribs = {
      source: 'facebook_group',
      signup_date: r.signupDate,
      first_name: r.firstName,
      last_name: r.lastName,
    };
    if (r.location) {
      attribs.location = r.location;
    }
    if (r.visitedBefore) {
      attribs.visited_before = r.visitedBefore;
    }
    out.push([csvCell(r.email), csvCell(r.name), csvCell(JSON.stringify(attribs))].join(','));
  }
  return `${out.join('\n')}\n`;
};
