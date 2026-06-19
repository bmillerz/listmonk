import React from 'react';

import { SocialLinksProps } from './SocialLinksPropsSchema';
import { renderSocialLinksHtml } from './renderSocialLinks';

// Editor preview renders the same HTML the export emits, wrapped in the block's
// outer padding (which rides onto the transformed Html block in the email).
export default function SocialLinksEditor({ style, props }: SocialLinksProps) {
  const p = style?.padding;
  const padding = p ? `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px` : undefined;
  return (
    <div style={{ padding, backgroundColor: style?.backgroundColor ?? undefined }}>
      <div dangerouslySetInnerHTML={{ __html: renderSocialLinksHtml(props) }} />
    </div>
  );
}
