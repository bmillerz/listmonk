import { AvatarSignoffProps } from './AvatarSignoffPropsSchema';

// Shared renderer: feeds both the editor preview and the email export. Table-based
// so the image-beside-text layout holds up in email clients (no flexbox); all
// inline-styled. The single shared function keeps editor and inbox identical.

const TEXT = '#2B2B2B';
const MUTED = '#8A8A8A';
const AVATAR_SIZE = 52;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Only allow http(s)/protocol-relative image URLs through to src; anything else
// (e.g. javascript:) is dropped.
function safeImageUrl(url: string): string {
  return /^(https?:\/\/|\/\/|\/)/i.test(url.trim()) ? escapeHtml(url.trim()) : '';
}

export function renderAvatarSignoffHtml(props: AvatarSignoffProps['props']): string {
  const imageUrl = safeImageUrl(props?.imageUrl ?? '');
  const name = escapeHtml(props?.name ?? '');
  const subtitle = escapeHtml(props?.subtitle ?? '');
  const radius = props?.shape === 'square' ? '8px' : '50%';

  const avatarCell = imageUrl
    ? `<td style="vertical-align:middle;padding-right:14px">` +
      `<img src="${imageUrl}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" alt="${name}" ` +
      `style="display:block;width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;border-radius:${radius};object-fit:cover"/>` +
      `</td>`
    : '';

  return [
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">`,
    `<tr>`,
    avatarCell,
    `<td style="vertical-align:middle">`,
    name ? `<div style="font-size:16px;font-weight:700;color:${TEXT};line-height:1.3">${name}</div>` : '',
    subtitle
      ? `<div style="font-size:14px;font-style:italic;color:${MUTED};line-height:1.4">${subtitle}</div>`
      : '',
    `</td>`,
    `</tr>`,
    `</table>`,
  ].join('');
}
