import { describe, expect, it } from 'vitest';

import { renderSocialLinksHtml } from './renderSocialLinks';

describe('renderSocialLinksHtml', () => {
  it('renders a green icon button per platform that has a URL', () => {
    const html = renderSocialLinksHtml({ website: 'https://example.com', facebook: 'https://facebook.com/x' });
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="https://facebook.com/x"');
    expect(html).toContain('background-color:#2F894B');
    expect(html).toContain('border-radius:50%');
    // platforms with no URL are omitted entirely
    expect(html).not.toContain('tiktok');
  });

  it('applies the alignment to the row table (default left)', () => {
    expect(renderSocialLinksHtml({ website: 'https://x.com', alignment: 'center' })).toContain('align="center"');
    expect(renderSocialLinksHtml({ website: 'https://x.com', alignment: 'right' })).toContain('align="right"');
    expect(renderSocialLinksHtml({ website: 'https://x.com' })).toContain('align="left"');
  });

  it('renders nothing when no URLs are set', () => {
    expect(renderSocialLinksHtml({})).toBe('');
    expect(renderSocialLinksHtml(null)).toBe('');
  });

  it('drops non-http(s) URLs (no javascript:)', () => {
    const html = renderSocialLinksHtml({ website: 'javascript:alert(1)', facebook: 'https://ok.com' });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('https://ok.com');
  });
});
