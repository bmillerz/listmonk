import { renderToStaticMarkup } from '@usewaypoint/email-builder';

import { brandHeadStyle } from './brand';
import { renderIrishWordOfTheWeekHtml } from './documents/blocks/IrishWordOfTheWeek/renderIrishWordOfTheWeek';
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

// Custom block types are unknown to the npm reader (renderToStaticMarkup throws
// on an unknown type), so before rendering we replace each with a built-in Html
// block carrying its rendered HTML. One case per custom block type; the same
// renderer feeds the editor preview, so editor and email stay identical.
export function transformCustomBlocks(document: TEditorConfiguration): TEditorConfiguration {
  const out: TEditorConfiguration = {};
  for (const [id, block] of Object.entries(document ?? {})) {
    const b = block as { type?: string; data?: { props?: Record<string, unknown>; style?: unknown } };
    if (b?.type === 'IrishWordOfTheWeek') {
      out[id] = {
        type: 'Html',
        data: {
          props: { contents: renderIrishWordOfTheWeekHtml(b.data?.props ?? null) },
          // Carry the block's outer padding onto the Html block so the sent email
          // spaces it like every other block (and like the editor preview).
          style: b.data?.style ?? undefined,
        },
      } as TEditorConfiguration[string];
    } else {
      out[id] = block;
    }
  }
  return out;
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
  // transformCustomBlocks has replaced every custom block with a built-in Html
  // block, so the result is a valid reader document despite its editor-typed
  // signature (which now includes custom block types the reader doesn't know).
  const readerDocument = transformCustomBlocks(document) as Parameters<typeof renderToStaticMarkup>[0];
  return injectBrandHead(renderToStaticMarkup(readerDocument, options), getColumnsGap(document));
}
