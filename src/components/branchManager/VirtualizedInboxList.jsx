import React from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * Virtualized inbox list for large queues (100+ items).
 * Renders only visible items + buffer, massively improves scroll/nav performance.
 */
export function VirtualizedInboxList({
  items = [],
  renderRow,
  maxHeight = 560,
  itemSize = 44, // Height of each row in pixels
  overscanCount = 5, // Items to render above/below viewport
  className = 'custom-scrollbar',
}) {
  if (!items.length) return null;

  const Row = ({ index, style }) => (
    <div style={style} key={items[index]?._rowKey || index}>
      {renderRow(items[index])}
    </div>
  );

  return (
    <List
      height={maxHeight}
      itemCount={items.length}
      itemSize={itemSize}
      width="100%"
      overscanCount={overscanCount}
      className={className}
    >
      {Row}
    </List>
  );
}
