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

  it('excludes buttons (links with an inline background) from the colour rule', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('a:not([style*="background"])');
  });

  it('stacks column cells full-width at the mobile breakpoint', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain(`@media only screen and (max-width:${MOBILE_BREAKPOINT_PX}px)`);
    expect(out).toContain('td[style*="content-box"]');
    expect(out).toContain('display:block !important');
  });

  it('uses the supplied column gap as vertical spacing between stacked columns', () => {
    const out = injectBrandHead('<html></html>', 24);
    expect(out).toContain('td[style*="content-box"]+td[style*="content-box"]{padding-top:24px !important}');
  });

  it('defaults the column gap to 0 when not supplied', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('padding-top:0px !important');
  });

  it('stretches a lone Container in a column to full cell height (equal cards)', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('td[style*="content-box"]>div[style*="background"]:only-child{height:100% !important}');
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
      a: { type: 'Text', data: { props: { text: 'A' } } },
      b: { type: 'Text', data: { props: { text: 'B' } } },
    }) as never;

  it('tags a reverse-on-mobile column table with .lm-rev and emits the flip rule', () => {
    const html = renderHtmlWithMeta(makeDoc(true), { rootBlockId: 'root' });
    expect(html).toContain('<table class="lm-rev"');
    expect(html).toContain('flex-direction:column-reverse');
  });

  it('does not tag a column table when reverse is off', () => {
    const html = renderHtmlWithMeta(makeDoc(false), { rootBlockId: 'root' });
    expect(html).not.toContain('<table class="lm-rev"');
  });
});

describe('brandHeadStyle', () => {
  it('rounds and clamps the gap to a non-negative integer', () => {
    expect(brandHeadStyle(15.6)).toContain('padding-top:16px !important');
    expect(brandHeadStyle(-5)).toContain('padding-top:0px !important');
    expect(brandHeadStyle(Number.NaN)).toContain('padding-top:0px !important');
  });
});
