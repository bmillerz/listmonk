import { describe, expect, it } from 'vitest';

import { renderHtmlWithMeta } from './utils';

// Gmail ignores CSS attribute selectors, so the brand link colour and responsive
// column rules (which keyed off `a:not([style*="background"])` and
// `td[style*="content-box"]`) silently did nothing there. These guard the fix:
// link colour is inlined, and column cells are tagged with a real `lm-col` class.
const render = (doc: unknown) => renderHtmlWithMeta(doc as never, { rootBlockId: 'root' });

describe('Gmail compatibility', () => {
  it('tags column cells with the lm-col class and targets the class (no attribute selectors)', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFFFFF', canvasColor: '#FFFFFF', childrenIds: ['cols'] } },
      cols: {
        type: 'ColumnsContainer',
        data: { props: { columnsCount: 2, columnsGap: 16, columns: [{ childrenIds: ['a'] }, { childrenIds: ['b'] }] } },
      },
      a: { type: 'Text', data: { props: { text: 'left' } } },
      b: { type: 'Text', data: { props: { text: 'right' } } },
    };
    const html = render(doc);
    expect((html.match(/<td\b[^>]*class="[^"]*lm-col[^"]*"[^>]*>/gi) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('.lm-col{display:block'); // @media rule targets the class
    expect(html).not.toContain('td[style*="content-box"]'); // attribute selector gone
  });

  it('inlines the brand accent colour on text links', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFFFFF', canvasColor: '#FFFFFF', childrenIds: ['t'] } },
      t: { type: 'Text', data: { props: { text: '[hello](https://example.com)', markdown: true } } },
    };
    const link = render(doc).match(/<a\b[^>]*>/i)?.[0] ?? '';
    expect(link).toContain('href="https://example.com"');
    expect(link).toContain('color:#2F894B');
  });

  it('leaves button links (which carry their own background) uncoloured', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFFFFF', canvasColor: '#FFFFFF', childrenIds: ['btn'] } },
      btn: { type: 'Button', data: { props: { text: 'Click', url: 'https://example.com' } } },
    };
    const link = render(doc).match(/<a\b[^>]*>/i)?.[0] ?? '';
    expect(link).toMatch(/background/i);
    expect(link).not.toContain('color:#2F894B');
  });
});
