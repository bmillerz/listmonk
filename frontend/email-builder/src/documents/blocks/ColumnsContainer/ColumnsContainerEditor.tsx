import React from 'react';

import { ColumnsContainer as BaseColumnsContainer } from '@usewaypoint/block-columns-container';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useSelectedScreenSize } from '../../editor/EditorContext';
import EditorChildrenIds, { EditorChildrenChange } from '../helpers/EditorChildrenIds';

import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema';

const EMPTY_COLUMNS = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];

export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId();
  const selectedScreenSize = useSelectedScreenSize();

  const { columns, ...restProps } = props ?? {};
  const columnsValue = columns ?? EMPTY_COLUMNS;

  const updateColumn = (columnIndex: 0 | 1 | 2, { block, blockId, childrenIds }: EditorChildrenChange) => {
    const nColumns = [...columnsValue];
    nColumns[columnIndex] = { childrenIds };
    setDocument({
      [blockId]: block,
      [currentBlockId]: {
        type: 'ColumnsContainer',
        data: ColumnsContainerPropsSchema.parse({
          style,
          props: {
            ...restProps,
            columns: nColumns,
          },
        }),
      },
    });
    setSelectedBlockId(blockId);
  };

  const columnEditors = ([0, 1, 2] as const).map((columnIndex) => (
    <EditorChildrenIds
      key={columnIndex}
      childrenIds={columns?.[columnIndex]?.childrenIds}
      onChange={(change) => updateColumn(columnIndex, change)}
    />
  ));

  // On the mobile toggle, mirror the responsive email output by stacking the
  // columns full-width and in order. Media queries can't drive the editor canvas
  // (it's a fixed-width container, not the viewport), so we react to the toggle
  // state directly instead. Real sent emails stack via the @media rule injected
  // in renderHtmlWithMeta; this keeps the editor preview WYSIWYG with that.
  if (selectedScreenSize === 'mobile') {
    const columnsCount = (restProps as { columnsCount?: 2 | 3 | null }).columnsCount ?? 2;
    const columnsGap = (restProps as { columnsGap?: number | null }).columnsGap ?? 0;
    const reverse = (restProps as { reverseStackOnMobile?: boolean | null }).reverseStackOnMobile ?? false;
    const padding = style?.padding;
    // Keyed by stable column index so reversing preserves each drop zone's identity.
    const order = [0, 1, 2].slice(0, columnsCount);
    if (reverse) {
      order.reverse();
    }
    return (
      <div
        style={{
          backgroundColor: style?.backgroundColor ?? undefined,
          padding: padding
            ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`
            : undefined,
          // Match the horizontal columnsGap as vertical spacing between the
          // stacked columns (gap applies only between items, not above/below).
          display: 'flex',
          flexDirection: 'column',
          gap: columnsGap,
        }}
      >
        {order.map((columnIndex) => (
          <div key={columnIndex} style={{ width: '100%' }}>
            {columnEditors[columnIndex]}
          </div>
        ))}
      </div>
    );
  }

  return <BaseColumnsContainer props={restProps} style={style} columns={columnEditors} />;
}
