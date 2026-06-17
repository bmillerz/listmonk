import { renderToStaticMarkup } from '@usewaypoint/email-builder';

import { brandHeadStyle } from './brand';
import { TEditorConfiguration } from './documents/editor/core';

// Returns the columnsGap of the first ColumnsContainer in the document, used as
// the vertical spacing between stacked columns on mobile. The exported @media
// rule is global, so a single gap represents the email (per-block gaps would
// need a per-block class hook in the column reader). 0 when there are none.
function getColumnsGap(document: TEditorConfiguration): number {
  for (const block of Object.values(document ?? {})) {
    // Loose access: the document is a discriminated union; only ColumnsContainer
    // carries columnsGap.
    const b = block as { type?: string; data?: { props?: { columnsGap?: number | null } } };
    if (b?.type === 'ColumnsContainer' && typeof b.data?.props?.columnsGap === 'number') {
      return b.data.props.columnsGap;
    }
  }
  return 0;
}

export function injectBrandHead(html: string, columnGapPx = 0): string {
  const head =
    '<head>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    `<style>${brandHeadStyle(columnGapPx)}</style>` +
    '</head>';
  // Match <html> with or without attributes (e.g. a future upstream `<html lang>`),
  // and fail loudly rather than silently shipping un-branded email if the tag is
  // ever absent — guards against a quiet regression on upstream rebases.
  const out = html.replace(/<html[^>]*>/, (tag) => tag + head);
  if (out === html) {
    throw new Error('injectBrandHead: no <html> tag found in rendered email output');
  }
  return out;
}

export function renderHtmlWithMeta(
  document: TEditorConfiguration,
  options: { rootBlockId: string }
): string {
  return injectBrandHead(renderToStaticMarkup(document, options), getColumnsGap(document));
}
