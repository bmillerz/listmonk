import { BRAND_ACCENT } from '../../../brand';
import { SocialLinksProps } from './SocialLinksPropsSchema';

// Shared renderer (editor preview + email export). Table-based row of green
// circular icon buttons. Icons are white PNGs (render in every client, unlike
// inline SVG which Gmail/Outlook strip). For large sends, host these 4 icons on
// your own domain and swap ICONS below — see notes.
const PLATFORMS = ['website', 'facebook', 'instagram', 'tiktok'] as const;
type Platform = (typeof PLATFORMS)[number];

const ICONS: Record<Platform, string> = {
  website: 'https://img.icons8.com/ios-filled/100/FFFFFF/domain.png',
  facebook: 'https://img.icons8.com/ios-filled/100/FFFFFF/facebook-new.png',
  instagram: 'https://img.icons8.com/ios-filled/100/FFFFFF/instagram-new.png',
  tiktok: 'https://img.icons8.com/ios-filled/100/FFFFFF/tiktok.png',
};

const LABELS: Record<Platform, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

// Only http(s) URLs are allowed through to href; anything else is dropped.
function safeUrl(url: string | null | undefined): string {
  const u = (url ?? '').trim();
  return /^https?:\/\//i.test(u) ? u.replace(/&/g, '&amp;').replace(/"/g, '&quot;') : '';
}

export function renderSocialLinksHtml(props: SocialLinksProps['props']): string {
  const cells = PLATFORMS.map((p) => {
    const url = safeUrl(props?.[p]);
    if (!url) {
      return '';
    }
    return (
      `<td style="padding:0 5px">` +
      `<a href="${url}" target="_blank" style="text-decoration:none">` +
      `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="display:inline-table">` +
      `<tr><td width="40" height="40" align="center" valign="middle" ` +
      `style="background-color:${BRAND_ACCENT};border-radius:50%">` +
      `<img src="${ICONS[p]}" width="20" height="20" alt="${LABELS[p]}" style="display:block;margin:0 auto;border:0"/>` +
      `</td></tr></table></a></td>`
    );
  }).join('');

  if (!cells) {
    return '';
  }
  // `align` on the table is the email-safe way to position the row (works in
  // Outlook too). Default left. `align=left/right` makes the table *float* in a
  // browser, so wrap it in a flow-root div that contains the float — otherwise
  // it escapes the editor's selection box.
  const a = props?.alignment;
  const align = a === 'center' || a === 'right' ? a : 'left';
  return (
    `<div style="display:flow-root">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="${align}"><tr>${cells}</tr></table>` +
    `</div>`
  );
}
