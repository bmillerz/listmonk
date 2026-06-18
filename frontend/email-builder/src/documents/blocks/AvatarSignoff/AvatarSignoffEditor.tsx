import React from 'react';

import { AvatarSignoffProps } from './AvatarSignoffPropsSchema';
import { renderAvatarSignoffHtml } from './renderAvatarSignoff';

// Editor preview renders the same HTML the export emits, wrapped in the block's
// outer padding (which rides onto the transformed Html block in the email).
export default function AvatarSignoffEditor({ style, props }: AvatarSignoffProps) {
  const p = style?.padding;
  const padding = p ? `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px` : undefined;
  return (
    <div style={{ padding }}>
      <div dangerouslySetInnerHTML={{ __html: renderAvatarSignoffHtml(props) }} />
    </div>
  );
}
