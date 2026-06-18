import React from 'react';

import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, setSelectedBlockId, useDocument, useSelectedScreenSize } from '../../editor/EditorContext';
import EditorChildrenIds, { EditorChildrenChange } from '../helpers/EditorChildrenIds';

import ColumnsContainerPropsSchema, { ColumnsContainerProps } from './ColumnsContainerPropsSchema';

const EMPTY_COLUMNS = [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }];

const JUSTIFY: Record<string, 'flex-start' | 'center' | 'flex-end'> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};

// The editor canvas renders columns with flexbox rather than the email's table.
// Reason: in a browser a table cell can't make its child fill to equal height
// (the percentage-height chain breaks at EmailLayout's min-height), whereas flex
// items stretch to equal height deterministically. The SENT email keeps the
// table layout (email clients require it) — both end up showing equal-height
// cards, which is the WYSIWYG match. Equal-height fill for the single-card
// pattern is finished by CSS in App/TemplatePanel (.lm-col-fill).
export default function ColumnsContainerEditor({ style, props }: ColumnsContainerProps) {
  const currentBlockId = useCurrentBlockId();
  const selectedScreenSize = useSelectedScreenSize();
  const document = useDocument();

  const { columns, ...restProps } = props ?? {};
  const columnsValue = columns ?? EMPTY_COLUMNS;

  const r = restProps as {
    columnsCount?: 2 | 3 | null;
    columnsGap?: number | null;
    fixedWidths?: Array<number | null> | null;
    contentAlignment?: 'top' | 'middle' | 'bottom' | null;
    reverseStackOnMobile?: boolean | null;
  };
  const columnsCount = r.columnsCount ?? 2;
  const columnsGap = r.columnsGap ?? 0;
  const fixedWidths = r.fixedWidths ?? null;
  const justify = JUSTIFY[r.contentAlignment ?? 'middle'] ?? 'center';
  const reverse = r.reverseStackOnMobile ?? false;

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

  const isMobile = selectedScreenSize === 'mobile';
  // Keyed by stable column index so reversing preserves each drop zone's identity.
  const order = [0, 1, 2].slice(0, columnsCount);
  if (isMobile && reverse) {
    order.reverse();
  }

  const padding = style?.padding;
  return (
    <div
      style={{
        backgroundColor: style?.backgroundColor ?? undefined,
        padding: padding
          ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`
          : undefined,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        // On desktop, columnsGap is the horizontal gap; on mobile it becomes the
        // vertical spacing between stacked columns (gap applies only between items).
        gap: columnsGap,
        // Stretch makes desktop columns equal height; harmless when stacked.
        alignItems: 'stretch',
      }}
    >
      {order.map((columnIndex) => {
        const i = columnIndex as 0 | 1 | 2;
        // Only a lone Container-with-a-background (a "card") fills to equal
        // height; any other content respects contentAlignment instead.
        const childIds = columns?.[i]?.childrenIds ?? [];
        const onlyChild = childIds.length === 1 ? document[childIds[0]] : undefined;
        const isCard =
          onlyChild?.type === 'Container' &&
          Boolean((onlyChild.data as { style?: { backgroundColor?: string | null } } | undefined)?.style?.backgroundColor);
        const width = fixedWidths?.[i] ?? null;
        const sizing: React.CSSProperties = isMobile
          ? { width: '100%' }
          : width
            ? { flex: `0 0 ${width}px`, minWidth: 0 }
            : { flex: '1 1 0', minWidth: 0 };
        return (
          <div
            key={columnIndex}
            // .lm-col-fill marks the single-card pattern; CSS grows the card to
            // fill the (flex-stretched, equal-height) column.
            className={isCard ? 'lm-col-fill' : undefined}
            style={{
              ...sizing,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: justify,
            }}
          >
            <EditorChildrenIds
              childrenIds={columns?.[i]?.childrenIds}
              onChange={(change) => updateColumn(i, change)}
            />
          </div>
        );
      })}
    </div>
  );
}
