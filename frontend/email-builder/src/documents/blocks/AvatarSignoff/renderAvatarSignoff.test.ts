import { describe, expect, it } from 'vitest';

import { renderAvatarSignoffHtml } from './renderAvatarSignoff';

describe('renderAvatarSignoffHtml', () => {
  it('renders the name, secondary line and the avatar image', () => {
    const html = renderAvatarSignoffHtml({
      imageUrl: 'https://example.com/a.png',
      name: 'Ben',
      subtitle: 'Ireland Tips for Travellers',
      shape: 'circle',
    });
    expect(html).toContain('Ben');
    expect(html).toContain('Ireland Tips for Travellers');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('border-radius:50%');
  });

  it('uses a square radius when shape is square', () => {
    const html = renderAvatarSignoffHtml({ imageUrl: 'https://x/y.png', name: 'A', shape: 'square' });
    expect(html).toContain('border-radius:8px');
  });

  it('drops a non-http(s) image URL (no javascript:)', () => {
    const html = renderAvatarSignoffHtml({ imageUrl: 'javascript:alert(1)', name: 'A' });
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
  });

  it('escapes HTML in text fields', () => {
    const html = renderAvatarSignoffHtml({ name: '<script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles null props without throwing', () => {
    expect(() => renderAvatarSignoffHtml(null)).not.toThrow();
  });
});
