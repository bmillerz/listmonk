import React from 'react';

import { IrishWordOfTheWeekProps } from './IrishWordOfTheWeekPropsSchema';
import { renderIrishWordOfTheWeekHtml } from './renderIrishWordOfTheWeek';

// The editor preview renders the exact same card HTML the email export emits (via
// the shared renderer), wrapped with the block's outer padding so spacing matches
// the sent email (where the same padding rides on the transformed Html block).
export default function IrishWordOfTheWeekEditor({ style, props }: IrishWordOfTheWeekProps) {
  const p = style?.padding;
  const padding = p ? `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px` : undefined;
  return (
    <div style={{ padding }}>
      <div dangerouslySetInnerHTML={{ __html: renderIrishWordOfTheWeekHtml(props) }} />
    </div>
  );
}
