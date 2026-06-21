import { describe, it, expect } from 'vitest';
import { parseRelativeTime, splitName, parseFacebookText } from './facebookParser';
import { SAMPLE } from './facebookParser.sample';

const NOW = new Date('2026-06-21T12:00:00.000Z');

describe('parseRelativeTime', () => {
  it('parses minutes with a space', () => {
    expect(parseRelativeTime('Requested 2 minutes ago', NOW).toISOString())
      .toBe('2026-06-21T11:58:00.000Z');
  });

  it('parses the Facebook glued form "Requested6 hours ago"', () => {
    expect(parseRelativeTime('Requested6 hours ago', NOW).toISOString())
      .toBe('2026-06-21T06:00:00.000Z');
  });

  it('parses "an hour ago"', () => {
    expect(parseRelativeTime('an hour ago', NOW).toISOString())
      .toBe('2026-06-21T11:00:00.000Z');
  });

  it('parses days that cross midnight', () => {
    expect(parseRelativeTime('Requested18 hours ago', NOW).toISOString())
      .toBe('2026-06-20T18:00:00.000Z');
  });

  it('parses "yesterday"', () => {
    expect(parseRelativeTime('yesterday', NOW).toISOString())
      .toBe('2026-06-20T12:00:00.000Z');
  });

  it('falls back to now on unrecognised text', () => {
    expect(parseRelativeTime('whenever', NOW).toISOString())
      .toBe('2026-06-21T12:00:00.000Z');
  });
});

describe('splitName', () => {
  it('splits a simple two-part name', () => {
    expect(splitName('Christina Sauriol')).toEqual({ firstName: 'Christina', lastName: 'Sauriol' });
  });

  it('keeps multi-word surnames intact', () => {
    expect(splitName('Bridgette Varnju Stemple')).toEqual({ firstName: 'Bridgette', lastName: 'Varnju Stemple' });
  });

  it('keeps hyphenated surnames intact', () => {
    expect(splitName('Annelise Hughes-Thompson')).toEqual({ firstName: 'Annelise', lastName: 'Hughes-Thompson' });
  });

  it('handles a single-word name', () => {
    expect(splitName('Cher')).toEqual({ firstName: 'Cher', lastName: '' });
  });

  it('collapses extra whitespace', () => {
    expect(splitName('  Mai   Kamal ')).toEqual({ firstName: 'Mai', lastName: 'Kamal' });
  });
});

describe('parseFacebookText', () => {
  const NOW2 = new Date('2026-06-21T12:00:00.000Z');
  const out = parseFacebookText(SAMPLE, NOW2);

  it('counts every person but not employer lines', () => {
    // 18 people in the sample; "Worked at"/"Works at"/"Manager at" lines must not count.
    expect(out.total).toBe(18);
  });

  it('keeps only the three rows with an email', () => {
    expect(out.rows.map((r) => r.email)).toEqual([
      'csauriol9@gmail.com',
      'kelly.sadauckas@gmail.com',
      'tricia_daigle13@yahoo.com',
    ]);
    expect(out.skippedNoEmail).toBe(15);
    expect(out.skippedDuplicate).toBe(0);
  });

  it('extracts name parts, signup date and visited answer', () => {
    const christina = out.rows[0];
    expect(christina.name).toBe('Christina Sauriol');
    expect(christina.firstName).toBe('Christina');
    expect(christina.lastName).toBe('Sauriol');
    expect(christina.signupDate).toBe('2026-06-21T06:00:00.000Z');
    expect(christina.visitedBefore).toBe('Yes, I just checked it out.');
    expect(christina.location).toBe('');
  });

  it('keeps multi-word surnames on emailed rows', () => {
    const tricia = out.rows[2];
    expect(tricia.firstName).toBe('Tricia');
    expect(tricia.lastName).toBe('Russell Daigle');
    expect(tricia.visitedBefore).toBe('No');
  });

  it('extracts location when the person both has an email and a "Lives in" line', () => {
    const block = [
      'Test Person (https://www.facebook.com/groups/1/user/2/)',
      'Requested3 hours ago',
      'Lives in Houston, Texas (https://www.facebook.com/Houston-Texas-1/)',
      'Please enter your email here. mailto:Test.Person@Example.com',
      'We run irelandtipsfortravellers.com. Have you visited it before? Maybe',
    ].join('\n');
    const r = parseFacebookText(block, NOW2).rows[0];
    expect(r.email).toBe('test.person@example.com');
    expect(r.location).toBe('Houston, Texas');
    expect(r.visitedBefore).toBe('Maybe');
  });

  it('deduplicates by email within one paste', () => {
    const dup = [
      'A One (https://www.facebook.com/groups/1/user/2/)',
      'Requested1 hour ago',
      'mailto:dup@example.com',
      'B Two (https://www.facebook.com/groups/1/user/3/)',
      'Requested1 hour ago',
      'mailto:DUP@example.com',
    ].join('\n');
    const res = parseFacebookText(dup, NOW2);
    expect(res.rows).toHaveLength(1);
    expect(res.skippedDuplicate).toBe(1);
  });
});
