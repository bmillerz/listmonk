import { describe, it, expect } from 'vitest';
import { parseRelativeTime, splitName } from './facebookParser';

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
