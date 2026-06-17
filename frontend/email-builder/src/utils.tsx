import { renderToStaticMarkup } from '@usewaypoint/email-builder';
import { TEditorConfiguration } from './documents/editor/core';

// --- Brand customisations injected into every rendered visual email's <head> ---
// Text links use the brand accent (#2F894B). Buttons render as <a> with an inline
// background-color, so a:not([style*="background"]) leaves their label untouched.
// ColumnsContainer cells carry `box-sizing:content-box` inline and no class, so the
// mobile media query targets that marker to stack columns full-width below 600px.
const BRAND_HEAD =
  '<head>' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<style>' +
  'a:not([style*="background"]),' +
  'a:not([style*="background"]):link,' +
  'a:not([style*="background"]):visited{color:#2F894B !important}' +
  '@media only screen and (max-width:600px){' +
  'td[style*="content-box"]{' +
  'display:block !important;width:100% !important;' +
  'padding-left:0 !important;padding-right:0 !important;' +
  'box-sizing:border-box !important}}' +
  '</style>' +
  '</head>';

export function injectBrandHead(html: string): string {
  return html.replace('<html>', '<html>' + BRAND_HEAD);
}

export function renderHtmlWithMeta(
  document: TEditorConfiguration,
  options: { rootBlockId: string }
): string {
  return injectBrandHead(renderToStaticMarkup(document, options));
}
