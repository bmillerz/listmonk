import insane from 'insane';
import { marked } from 'marked';

import { BRAND_ACCENT } from '../../../brand';
import { IrishWordOfTheWeekProps } from './IrishWordOfTheWeekPropsSchema';

// --- Editorial dictionary card. White stock, hairline border, the brand green
// used once on the headword. No forced font-family — it inherits the email's
// typography. Inline-styled and email-safe (no flexbox/gradients/animation). ---

const TEXT = '#2B2B2B';
const MUTED = '#8A8A8A';
const BORDER = '#E5E5E5';

// Tags markdown can emit that are safe to keep. Everything else (script, iframe,
// event handlers, javascript: URLs) is stripped by insane — the same sanitizer
// the built-in Text block uses on its own markdown.
const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'u', 'ul',
];

// Drop the bottom margin from a block's final paragraph so it doesn't add
// trailing whitespace below the last line (email clients have no :last-child).
function trimTrailingParagraph(html: string): string {
  const marker = '<p style="margin:0 0 12px">';
  const last = html.lastIndexOf(marker);
  if (last === -1) {
    return html;
  }
  return html.slice(0, last) + '<p style="margin:0">' + html.slice(last + marker.length);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Markdown bodies (definitions, origin) -> HTML. Parse, sanitize, then style the
// (now-trusted) elements inline so they render consistently across email clients.
function markdownToHtml(md: string): string {
  if (!md.trim()) {
    return '';
  }
  const html = insane(marked.parse(md, { async: false }) as string, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'name', 'target'] },
  });
  return html
    .replace(/<blockquote>/g, `<blockquote style="margin:4px 0 14px;padding:0;color:${MUTED};font-style:italic">`)
    .replace(/<strong>/g, `<strong style="color:${TEXT};font-weight:700">`)
    .replace(/<p>/g, '<p style="margin:0 0 12px">')
    .replace(/<ol>/g, '<ol style="margin:0 0 12px;padding-left:22px">')
    .replace(/<ul>/g, '<ul style="margin:0 0 12px;padding-left:22px">');
}

export function renderIrishWordOfTheWeekHtml(props: IrishWordOfTheWeekProps['props']): string {
  const word = escapeHtml(props?.word ?? '');
  const pronunciation = escapeHtml(props?.pronunciation ?? '');
  const partOfSpeech = escapeHtml(props?.partOfSpeech ?? '');
  const definitions = markdownToHtml(props?.definitions ?? '');
  const origin = trimTrailingParagraph(markdownToHtml(props?.origin ?? ''));

  return [
    `<div style="margin:0;background-color:#FFFFFF;border:1px solid ${BORDER};border-radius:8px;padding:30px 32px;color:${TEXT}">`,

    // Eyebrow
    `<div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND_ACCENT};margin:0 0 16px">Irish Word of the Week</div>`,

    // Headword (the one green accent) + pronunciation
    `<div style="margin:0 0 6px;line-height:1.1">`,
    `<span style="font-size:38px;font-weight:700;color:${BRAND_ACCENT};letter-spacing:-0.01em">${word}</span>`,
    pronunciation
      ? `<span style="font-size:18px;font-style:italic;color:${MUTED};margin-left:12px">${pronunciation}</span>`
      : '',
    `</div>`,

    // Part of speech
    partOfSpeech
      ? `<div style="font-size:13px;font-style:italic;color:${MUTED};margin:0 0 22px">${partOfSpeech}</div>`
      : '',

    // Definitions
    `<div style="font-size:14px;line-height:1.7;color:${TEXT}">${definitions}</div>`,

    // Divider + origin
    `<hr style="border:none;border-top:1px solid ${BORDER};margin:22px 0 16px"/>`,
    `<div style="font-size:12.5px;line-height:1.6;color:${MUTED}">${origin}</div>`,

    `</div>`,
  ].join('');
}
