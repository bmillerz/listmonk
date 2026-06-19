import { renderToStaticMarkup } from '@usewaypoint/email-builder';

import { BRAND_ACCENT, brandHeadStyle } from './brand';
import { renderAvatarSignoffHtml } from './documents/blocks/AvatarSignoff/renderAvatarSignoff';
import { renderIrishWordOfTheWeekHtml } from './documents/blocks/IrishWordOfTheWeek/renderIrishWordOfTheWeek';
import { renderSocialLinksHtml } from './documents/blocks/SocialLinks/renderSocialLinks';
import { TEditorConfiguration } from './documents/editor/core';

// Each custom block type maps to the function that renders it to email-safe HTML.
// Adding a block = one line here (plus its editor registration).
const CUSTOM_BLOCK_RENDERERS: Record<string, (props: never) => string> = {
  IrishWordOfTheWeek: renderIrishWordOfTheWeekHtml as (props: never) => string,
  AvatarSignoff: renderAvatarSignoffHtml as (props: never) => string,
  SocialLinks: renderSocialLinksHtml as (props: never) => string,
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

// Reverse-on-mobile columns: Gmail ignores flexbox, so stacking order can't be
// flipped with CSS. Instead, for each ColumnsContainer flagged reverseStackOnMobile,
// physically reverse its rendered cells and set the COLUMN TABLE's dir="rtl" (cells
// dir="ltr"). Table-level dir="rtl" restores the original left-to-right column order
// on desktop, while the reversed source order makes the cells stack bottom-to-top
// when they go full-width on mobile.
// Each cell keeps the padding it was rendered with, so the desktop column gap is
// unchanged — and there's no flexbox or attribute selector, so it works in Gmail too.
// Column tables are matched by their unique `table-layout:fixed` style, in render
// order, against the flags. (A reversed column nested inside another reversed column
// is left in place — rare, and reversing both would corrupt the spliced spans.)
function reverseColumnsForMobile(html: string, flags: boolean[]): string {
  if (!flags.some(Boolean)) {
    return html;
  }
  const ops: { start: number; end: number; replacement: string }[] = [];
  const colTable = /<table\b(?=[^>]*table-layout:fixed)/gi;
  let match: RegExpExecArray | null;
  let flagIndex = 0;
  while ((match = colTable.exec(html)) !== null) {
    const reversed = flags[flagIndex] === true;
    flagIndex += 1;
    if (!reversed) {
      continue;
    }
    const tableStart = match.index;
    const tableTag = match[0];
    const rel = html.slice(tableStart).search(/<tr\b/i);
    if (rel < 0) {
      continue;
    }
    const trStart = tableStart + rel;
    const trTagEnd = html.indexOf('>', trStart) + 1;
    const closeIdx = matchingCloseIndex(html, trTagEnd, 'tr');
    if (trTagEnd <= 0 || closeIdx < 0) {
      continue;
    }
    const end = closeIdx + '</tr>'.length;
    // Skip a table that overlaps one already queued (nested reversed columns).
    if (ops.some((o) => tableStart < o.end && end > o.start)) {
      continue;
    }
    const cells = splitTopLevelCells(html.slice(trTagEnd, closeIdx));
    if (cells.length < 2) {
      continue;
    }
    // Two edits per reversed block:
    //  1. reverse the cells in place (each kept content-LTR via dir="ltr"), so they
    //     stack bottom-to-top once they go full-width on mobile;
    //  2. set dir="rtl" on the COLUMN <table> — this is what actually flips table
    //     column order, restoring the original left-to-right order on desktop. (dir
    //     on the <tr> does NOT reorder columns — column order is a table-level
    //     property — which is why the row-level version rendered reversed on desktop.)
    const reversedCells = cells
      .map((c) => c.replace(/^<td\b/i, '<td dir="ltr"'))
      .reverse()
      .join('');
    ops.push({ start: trTagEnd, end: closeIdx, replacement: reversedCells });
    ops.push({ start: tableStart, end: tableStart + tableTag.length, replacement: `${tableTag} dir="rtl"` });
  }
  // Apply right-to-left so earlier offsets stay valid.
  ops.sort((a, b) => b.start - a.start);
  let out = html;
  for (const op of ops) {
    out = out.slice(0, op.start) + op.replacement + out.slice(op.end);
  }
  return out;
}

// Index of the '<' of the </tag> matching the <tag> opened just before fromIdx,
// counting nested same-name tags. Returns -1 if unbalanced.
function matchingCloseIndex(html: string, fromIdx: number, tag: string): number {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  re.lastIndex = fromIdx;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[0][1] === '/') {
      depth -= 1;
      if (depth === 0) {
        return m.index;
      }
    } else {
      depth += 1;
    }
  }
  return -1;
}

// Splits a table row's inner HTML into its top-level <td>…</td> cells, keeping nested
// tables' cells (which sit at a deeper depth) inside their parent cell.
function splitTopLevelCells(rowInner: string): string[] {
  const cells: string[] = [];
  const re = /<td\b|<\/td>/gi;
  let depth = 0;
  let start = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowInner)) !== null) {
    if (m[0][1] === '/') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        cells.push(rowInner.slice(start, m.index + m[0].length));
        start = -1;
      }
    } else {
      if (depth === 0) {
        start = m.index;
      }
      depth += 1;
    }
  }
  return cells;
}

// Gmail ignores CSS attribute selectors (e.g. `td[style*="content-box"]`), so the
// responsive column rules in brandHeadStyle silently did nothing there while working
// in Apple Mail. The npm reader renders each ColumnsContainer cell with an inline
// `box-sizing:content-box` and no class; tag those cells with the real `lm-col` class
// so the @media stacking/reverse rules (which now target `.lm-col`) apply in Gmail too.
function tagColumnCells(html: string): string {
  return html.replace(/<td\b([^>]*)>/gi, (tag, attrs: string) => {
    if (!/content-box/i.test(attrs)) {
      return tag;
    }
    const classAttr = attrs.match(/\sclass\s*=\s*"([^"]*)"/i);
    if (classAttr) {
      return /\blm-col\b/.test(classAttr[1])
        ? tag
        : `<td${attrs.replace(/(\sclass\s*=\s*")([^"]*)(")/i, '$1$2 lm-col$3')}>`;
    }
    return `<td${attrs} class="lm-col">`;
  });
}

// Gmail also ignores `a:not([style*="background"])`, so the brand link colour never
// applied there. Inline the accent colour directly on each text link — inline styles
// work in every client. Button links carry an inline `background` (and their own text
// colour), so they're left untouched; any link with its own explicit colour is too.
function inlineBrandLinkColor(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const styleAttr = attrs.match(/\sstyle\s*=\s*"([^"]*)"/i);
    const style = styleAttr ? styleAttr[1] : '';
    if (/background/i.test(style)) {
      return tag;
    }
    const withoutColor = style.replace(/(?:^|;)\s*color\s*:[^;]*/gi, '').replace(/^;+/, '');
    const newStyle = withoutColor ? `color:${BRAND_ACCENT};${withoutColor}` : `color:${BRAND_ACCENT}`;
    return styleAttr
      ? `<a${attrs.replace(/(\sstyle\s*=\s*")[^"]*(")/i, `$1${newStyle}$2`)}>`
      : `<a${attrs} style="${newStyle}">`;
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
  // Post-process for Gmail (which ignores attribute selectors and flexbox):
  // structurally reverse reverse-on-mobile column rows, tag column cells with the
  // `lm-col` class so the @media rules apply, and inline the brand link colour.
  // reverseColumnsForMobile runs first so it sees the raw rendered <tr>/<td>s.
  let html = injectBrandHead(
    inlineBrandLinkColor(
      tagColumnCells(
        reverseColumnsForMobile(
          renderToStaticMarkup(readerDocument, options),
          collectReversedColumnFlags(document, options.rootBlockId)
        )
      )
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
