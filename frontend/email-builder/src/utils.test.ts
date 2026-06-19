import { describe, expect, it } from 'vitest';

import { BRAND_ACCENT, MOBILE_BREAKPOINT_PX, brandHeadStyle } from './brand';
import { injectBrandHead, renderHtmlWithMeta } from './utils';

describe('injectBrandHead', () => {
  it('injects a <head> immediately after <html>', () => {
    const out = injectBrandHead('<html><body>x</body></html>');
    expect(out.startsWith('<html><head>')).toBe(true);
  });

  it('applies the brand accent to text links with !important', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain(`color:${BRAND_ACCENT} !important`);
  });

  it('gives all images an 8px border radius', () => {
    expect(injectBrandHead('<html></html>')).toContain('img{border-radius:8px}');
  });

  it('excludes buttons (links with an inline background) from the colour rule', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('a:not([style*="background"])');
  });

  it('stacks column cells full-width at the mobile breakpoint', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain(`@media only screen and (max-width:${MOBILE_BREAKPOINT_PX}px)`);
    // Class selector (not an attribute selector) so Gmail applies it; cells are
    // tagged with `lm-col` during export. See gmail-compat.test.ts.
    expect(out).toContain('.lm-col{display:block !important');
    expect(out).toContain('display:block !important');
  });

  it('uses the supplied column gap as vertical spacing between stacked columns', () => {
    const out = injectBrandHead('<html></html>', 24);
    expect(out).toContain('.lm-col+.lm-col{padding-top:24px !important}');
  });

  it('defaults the column gap to 0 when not supplied', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('padding-top:0px !important');
  });

  it('stretches a lone card (.lm-card) in a column to full cell height (equal cards)', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('.lm-col>.lm-card{height:100% !important}');
  });

  it('adds the charset, iOS and light color-scheme metas', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('<meta charset="utf-8">');
    expect(out).toContain('x-apple-disable-message-reformatting');
    expect(out).toContain('<meta name="color-scheme" content="light">');
    expect(out).toContain('<meta name="supported-color-schemes" content="light">');
  });

  it('drops the EmailLayout backdrop vertical framing on mobile', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('div[style*="padding:32px 0"]{padding-top:0 !important;padding-bottom:0 !important}');
  });

  it('handles an <html> tag that carries attributes', () => {
    const out = injectBrandHead('<html lang="en"><body>x</body></html>');
    expect(out.startsWith('<html lang="en"><head>')).toBe(true);
    expect(out).toContain(`color:${BRAND_ACCENT} !important`);
  });

  it('throws (rather than silently no-op) when there is no <html> tag', () => {
    expect(() => injectBrandHead('<body>x</body>')).toThrow(/no <html> tag/);
  });
});

describe('renderHtmlWithMeta custom blocks', () => {
  it('renders an IrishWordOfTheWeek block into the email (transformed, no throw)', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFF', canvasColor: '#FFF', childrenIds: ['w'] } },
      w: {
        type: 'IrishWordOfTheWeek',
        data: {
          style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
          props: { word: 'yoke', definitions: '**hi**' },
        },
      },
    } as never;
    const html = renderHtmlWithMeta(doc, { rootBlockId: 'root' });
    expect(html).toContain('Irish Word of the Week');
    expect(html).toContain('yoke');
    expect(html).toMatch(/<strong[^>]*>hi<\/strong>/);
    // The block's outer padding must ride through to the sent email.
    expect(html).toContain('padding:16px 24px 16px 24px');
  });

  it('renders a SocialLinks block into the email', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFF', canvasColor: '#FFF', childrenIds: ['soc'] } },
      soc: {
        type: 'SocialLinks',
        data: { props: { website: 'https://example.com', instagram: 'https://instagram.com/x' } },
      },
    } as never;
    const html = renderHtmlWithMeta(doc, { rootBlockId: 'root' });
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="https://instagram.com/x"');
  });

  it('renders an AvatarSignoff block into the email', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFF', canvasColor: '#FFF', childrenIds: ['s'] } },
      s: {
        type: 'AvatarSignoff',
        data: { props: { imageUrl: 'https://example.com/a.png', name: 'Ben', subtitle: 'Ireland Tips for Travellers' } },
      },
    } as never;
    const html = renderHtmlWithMeta(doc, { rootBlockId: 'root' });
    expect(html).toContain('Ben');
    expect(html).toContain('Ireland Tips for Travellers');
    expect(html).toContain('src="https://example.com/a.png"');
  });
});

describe('renderHtmlWithMeta column reversal', () => {
  const makeDoc = (reverse: boolean) =>
    ({
      root: { type: 'EmailLayout', data: { backdropColor: '#FFF', canvasColor: '#FFF', childrenIds: ['cols'] } },
      cols: {
        type: 'ColumnsContainer',
        data: {
          props: {
            columnsCount: 2,
            columnsGap: 16,
            reverseStackOnMobile: reverse,
            columns: [{ childrenIds: ['a'] }, { childrenIds: ['b'] }, { childrenIds: [] }],
          },
        },
      },
      a: { type: 'Text', data: { props: { text: 'COLALPHA' } } },
      b: { type: 'Text', data: { props: { text: 'COLBETA' } } },
    }) as never;

  it('reverses the cells and sets table dir="rtl" (Gmail-safe, no flexbox) for reverse-on-mobile', () => {
    const html = renderHtmlWithMeta(makeDoc(true), { rootBlockId: 'root' });
    // Column B (source 2nd) is physically moved before column A...
    expect(html.indexOf('COLBETA')).toBeLessThan(html.indexOf('COLALPHA'));
    // ...with dir="rtl" on the COLUMN TABLE (not the row — that wouldn't reorder
    // columns) restoring the original left-to-right order on desktop,
    expect(html).toMatch(/<table dir="rtl"[^>]*table-layout:fixed/);
    expect(html).not.toMatch(/<tr[^>]*\sdir="rtl"/);
    // ...and dir="ltr" on the cells keeping their content left-to-right.
    expect(html).toContain('dir="ltr"');
    // No flexbox (Gmail ignores it) and no leftover lm-rev marker.
    expect(html).not.toContain('flex-direction:column-reverse');
    expect(html).not.toContain('lm-rev');
  });

  it('keeps cells in source order with no dir when reverse is off', () => {
    const html = renderHtmlWithMeta(makeDoc(false), { rootBlockId: 'root' });
    expect(html.indexOf('COLALPHA')).toBeLessThan(html.indexOf('COLBETA'));
    expect(html).not.toContain('dir="rtl"');
  });
});

describe('renderHtmlWithMeta preview text', () => {
  it('injects a hidden preheader when the EmailLayout has preview text', () => {
    const doc = {
      root: {
        type: 'EmailLayout',
        data: { backdropColor: '#FFF', canvasColor: '#FFF', previewText: 'A sneak peek', childrenIds: [] },
      },
    } as never;
    const html = renderHtmlWithMeta(doc, { rootBlockId: 'root' });
    expect(html).toContain('A sneak peek');
    expect(html).toContain('display:none');
  });

  it('adds no preheader when preview text is empty', () => {
    const doc = {
      root: { type: 'EmailLayout', data: { backdropColor: '#FFF', canvasColor: '#FFF', childrenIds: [] } },
    } as never;
    const html = renderHtmlWithMeta(doc, { rootBlockId: 'root' });
    expect(html).not.toContain('mso-hide:all');
  });
});

describe('brandHeadStyle', () => {
  it('rounds and clamps the gap to a non-negative integer', () => {
    expect(brandHeadStyle(15.6)).toContain('padding-top:16px !important');
    expect(brandHeadStyle(-5)).toContain('padding-top:0px !important');
    expect(brandHeadStyle(Number.NaN)).toContain('padding-top:0px !important');
  });
});
