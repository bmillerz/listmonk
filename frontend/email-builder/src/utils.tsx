import { renderToStaticMarkup } from '@usewaypoint/email-builder';

import { brandHeadStyle } from './brand';
import { renderAvatarSignoffHtml } from './documents/blocks/AvatarSignoff/renderAvatarSignoff';
import { renderIrishWordOfTheWeekHtml } from './documents/blocks/IrishWordOfTheWeek/renderIrishWordOfTheWeek';
import { TEditorConfiguration } from './documents/editor/core';

// Each custom block type maps to the function that renders it to email-safe HTML.
// Adding a block = one line here (plus its editor registration).
const CUSTOM_BLOCK_RENDERERS: Record<string, (props: never) => string> = {
  IrishWordOfTheWeek: renderIrishWordOfTheWeekHtml as (props: never) => string,
  AvatarSignoff: renderAvatarSignoffHtml as (props: never) => string,
};

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
    const render = b?.type ? CUSTOM_BLOCK_RENDERERS[b.type] : undefined;
    if (render) {
      out[id] = {
        type: 'Html',
        data: {
          props: { contents: render((b.data?.props ?? null) as never) },
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

// Walks the document in the SAME depth-first order the reader renders, returning
// one flag per ColumnsContainer (in render order) marking whether it reverses on
// mobile. Used to tag the matching <table>s in the output by position.
function collectReversedColumnFlags(document: TEditorConfiguration, rootId: string): boolean[] {
  const flags: boolean[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) {
      return; // guard against malformed cyclic documents
    }
    seen.add(id);
    const block = document[id] as
      | { type?: string; data?: { childrenIds?: string[]; props?: Record<string, unknown> } }
      | undefined;
    if (!block) {
      return;
    }
    const { type, data } = block;
    if (type === 'ColumnsContainer') {
      const props = data?.props as
        | { reverseStackOnMobile?: boolean | null; columnsCount?: number | null; columns?: { childrenIds?: string[] }[] }
        | undefined;
      flags.push(props?.reverseStackOnMobile === true);
      const count = props?.columnsCount ?? 2; // reader renders only `columnsCount` cells
      (props?.columns ?? []).slice(0, count).forEach((col) => (col?.childrenIds ?? []).forEach(visit));
    } else if (type === 'EmailLayout') {
      (data?.childrenIds ?? []).forEach(visit);
    } else if (type === 'Container') {
      ((data?.props?.childrenIds as string[] | undefined) ?? []).forEach(visit);
    }
  };
  visit(rootId);
  return flags;
}

// Tags the column <table>s belonging to reverse-on-mobile blocks with `.lm-rev`
// so the @media rule can flip them. Tables are matched by their unique
// `table-layout:fixed` style, in render order, against the flags above.
function markReversedColumns(html: string, flags: boolean[]): string {
  if (!flags.some(Boolean)) {
    return html;
  }
  let i = 0;
  return html.replace(/<table\s(?=[^>]*table-layout:fixed)/g, (tag) => {
    const reversed = flags[i] === true;
    i += 1;
    return reversed ? '<table class="lm-rev" ' : tag;
  });
}

// The EmailLayout root holds the email's global settings, including preview text.
function getPreviewText(document: TEditorConfiguration, rootId: string): string {
  const root = document?.[rootId] as { type?: string; data?: { previewText?: string | null } } | undefined;
  return root?.type === 'EmailLayout' && typeof root.data?.previewText === 'string' ? root.data.previewText : '';
}

// Hidden preheader: the snippet inbox clients show under the subject line. The
// trailing zero-width spacers stop the visible body from leaking into the preview.
function preheaderHtml(text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const spacer = '&#847;&zwnj;&nbsp;'.repeat(40);
  return (
    `<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;` +
    `font-size:1px;line-height:1px;color:#ffffff;opacity:0">${safe}${spacer}</div>`
  );
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
  let html = injectBrandHead(
    markReversedColumns(
      renderToStaticMarkup(readerDocument, options),
      collectReversedColumnFlags(document, options.rootBlockId)
    ),
    getColumnsGap(document)
  );
  const preview = getPreviewText(document, options.rootBlockId).trim();
  if (preview) {
    const preheader = preheaderHtml(preview);
    html = html.includes('<body')
      ? html.replace(/<body[^>]*>/, (tag) => tag + preheader)
      : html.replace('</head>', `</head>${preheader}`);
  }
  return html;
}
