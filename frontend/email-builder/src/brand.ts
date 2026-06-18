// Single source of truth for brand customisations of the visual email builder.
// Imported by utils.tsx (email export) and App/TemplatePanel (editor preview)
// so the accent colour and mobile breakpoint are defined exactly once.

export const BRAND_ACCENT = '#2F894B';

// Width (px) below which a sent email switches to the stacked, single-column
// mobile layout. Used in the exported email's @media rule.
export const MOBILE_BREAKPOINT_PX = 600;

/**
 * Builds the CSS injected into every exported email's <head>:
 *  - text links use BRAND_ACCENT (buttons, which carry an inline
 *    background-color, are excluded);
 *  - below MOBILE_BREAKPOINT_PX, ColumnsContainer cells (marked by the inline
 *    `box-sizing:content-box`) stack full-width, and the gap between stacked
 *    columns matches the block's horizontal columnsGap via the adjacent-sibling
 *    rule (which targets the 2nd/3rd cells only, never above the first).
 *
 * @param columnGapPx vertical gap between stacked columns, in px.
 */
export function brandHeadStyle(columnGapPx = 0): string {
  const gap = Number.isFinite(columnGapPx) ? Math.max(0, Math.round(columnGapPx)) : 0;
  return (
    `a:not([style*="background"]),` +
    `a:not([style*="background"]):link,` +
    `a:not([style*="background"]):visited{color:${BRAND_ACCENT} !important}` +
    // Equal-height cards: column cells are already equal height (table rows),
    // so a lone Container in a column filling its cell (height:100%) makes
    // side-by-side cards match height. Scoped to :only-child so multi-block
    // columns are untouched.
    `td[style*="content-box"]{height:100% !important}` +
    `td[style*="content-box"]>div:only-child{height:100% !important}` +
    `@media only screen and (max-width:${MOBILE_BREAKPOINT_PX}px){` +
    `td[style*="content-box"]{display:block !important;width:100% !important;` +
    `padding-left:0 !important;padding-right:0 !important;box-sizing:border-box !important}` +
    `td[style*="content-box"]+td[style*="content-box"]{padding-top:${gap}px !important}` +
    // Drop the EmailLayout backdrop's hard-coded 32px top/bottom framing on
    // mobile (its inline style is the unique `padding:32px 0` marker).
    `div[style*="padding:32px 0"]{padding-top:0 !important;padding-bottom:0 !important}}`
  );
}
