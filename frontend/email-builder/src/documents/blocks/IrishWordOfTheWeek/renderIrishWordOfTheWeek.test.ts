import { describe, expect, it } from 'vitest';

import { renderIrishWordOfTheWeekHtml } from './renderIrishWordOfTheWeek';

describe('renderIrishWordOfTheWeekHtml', () => {
  it('renders the fixed header, word, pronunciation and part of speech', () => {
    const html = renderIrishWordOfTheWeekHtml({ word: 'yoke', pronunciation: '/jəʊk/', partOfSpeech: 'noun · Hiberno-English' });
    expect(html).toContain('Irish Word of the Week');
    expect(html).toContain('yoke');
    expect(html).toContain('/jəʊk/');
    expect(html).toContain('noun · Hiberno-English');
  });

  it('renders markdown definitions (bold + styled blockquote)', () => {
    const html = renderIrishWordOfTheWeekHtml({ definitions: '**1.** a thing\n> "example"' });
    expect(html).toMatch(/<strong[^>]*>1\.<\/strong>/);
    expect(html).toContain('<blockquote style="');
    expect(html).toContain('example');
  });

  it('escapes HTML in the plain fields', () => {
    const html = renderIrishWordOfTheWeekHtml({ word: '<script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sanitizes markdown: strips <script> and javascript: links (XSS)', () => {
    const html = renderIrishWordOfTheWeekHtml({
      definitions: 'safe text <script>alert(1)</script> [bad](javascript:alert(1)) <img src=x onerror=alert(1)>',
    });
    expect(html).toContain('safe text');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
  });

  it('handles null/empty props without throwing', () => {
    expect(() => renderIrishWordOfTheWeekHtml(null)).not.toThrow();
    expect(renderIrishWordOfTheWeekHtml(null)).toContain('Irish Word of the Week');
  });
});
