import React, { useMemo, useRef, useState, useEffect } from 'react';

/**
 * Lightweight windowing for tall lists when server paging is not available.
 * Renders only rows near the scroll viewport (fixed row height).
 */
export function VirtualizedRows({
  items,
  rowHeight = 56,
  overscan = 8,
  className = '',
  style,
  renderRow,
  getKey,
}) {
  const scrollerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(480);
  const list = Array.isArray(items) ? items : [];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const onScroll = () => setScrollTop(el.scrollTop);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => setViewportH(el.clientHeight || 480)) : null;
    ro?.observe(el);
    setViewportH(el.clientHeight || 480);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, []);

  const { start, end, offsetY, totalH } = useMemo(() => {
    const total = list.length;
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(viewportH / rowHeight) + overscan * 2;
    const endIdx = Math.min(total, startIdx + visible);
    return {
      start: startIdx,
      end: endIdx,
      offsetY: startIdx * rowHeight,
      totalH: total * rowHeight,
    };
  }, [list.length, scrollTop, viewportH, rowHeight, overscan]);

  const slice = list.slice(start, end);

  return (
    <div
      ref={scrollerRef}
      className={className}
      style={{ overflowY: 'auto', maxHeight: 'min(70vh, 40rem)', ...style }}
    >
      <div style={{ height: totalH, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => {
            const index = start + i;
            const key = getKey ? getKey(item, index) : index;
            return (
              <div key={key} style={{ height: rowHeight }}>
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
