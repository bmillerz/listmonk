import { describe, it, expect } from 'vitest';
import { injectBrandHead } from './utils';

describe('injectBrandHead', () => {
  it('injects a <head> immediately after <html>', () => {
    const out = injectBrandHead('<html><body>x</body></html>');
    expect(out.startsWith('<html><head>')).toBe(true);
  });

  it('applies the brand accent to text links with !important', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('color:#2F894B !important');
  });

  it('excludes buttons (links with an inline background) from the colour rule', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toContain('a:not([style*="background"])');
  });

  it('stacks column cells full-width below 600px', () => {
    const out = injectBrandHead('<html></html>');
    expect(out).toMatch(/@media only screen and \(max-width:600px\)/);
    expect(out).toContain('td[style*="content-box"]');
    expect(out).toContain('display:block !important');
  });
});
