import React from 'react';
import { APP_DATA_TABLE_PAGE_SIZE } from '../../lib/appDataTable';

/**
 * Shared data-table chrome: readable type, single-line rows (truncate + title), consistent with app teal accent.
 *
 * Roles:
 * - browse: default row hover (lists, directories)
 * - numeric: tabular-nums on table body context
 * - reference: master data / codes (neutral hover)
 */

const HEADER_ROW_CLASS = 'border-b border-slate-200 bg-slate-50';

function isTableRowElement(child) {
  if (!React.isValidElement(child)) return false;
  if (child.type === 'tr' || child.type === AppTableTr) return true;
  return false;
}

export function AppTableWrap({ children, className = '' }) {
  return (
    <div
      className={`z-scroll-x min-w-0 w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function AppTable({ role = 'browse', children, className = '' }) {
  const bodyNum = role === 'numeric' ? 'tabular-nums' : '';
  return (
    <table className={`w-full min-w-full border-collapse text-left text-sm text-slate-800 ${bodyNum} ${className}`}>
      {children}
    </table>
  );
}

export function AppTableThead({ children, sticky = false }) {
  const theadCls = sticky ? 'sticky top-0 z-10 shadow-[0_1px_0_rgba(226,232,240,1)]' : '';
  const hasExplicitRow = React.Children.toArray(children).some(isTableRowElement);

  if (hasExplicitRow) {
    return (
      <thead className={theadCls}>
        {React.Children.map(children, (child) => {
          if (!isTableRowElement(child)) return child;
          return React.cloneElement(child, {
            variant: 'header',
            className: `${HEADER_ROW_CLASS} ${child.props.className || ''}`.trim(),
          });
        })}
      </thead>
    );
  }

  return (
    <thead className={theadCls}>
      <tr className={HEADER_ROW_CLASS}>{children}</tr>
    </thead>
  );
}

/** Readable header: avoids micro text-[10px]. */
export function AppTableTh({ children, align = 'left', className = '', style }) {
  const a =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      scope="col"
      style={style}
      className={`px-4 py-3 align-middle text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap first:pl-5 last:pr-5 ${a} ${className}`}
    >
      {children}
    </th>
  );
}

export function AppTableBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function AppTableTr({ children, role = 'browse', variant, onClick, className = '', title }) {
  const isHeader = variant === 'header';
  const hover = isHeader
    ? ''
    : role === 'reference'
      ? 'hover:bg-slate-50/80'
      : 'hover:bg-teal-50/40';
  const border = isHeader ? '' : 'border-t border-slate-100';
  const cur = onClick ? 'cursor-pointer' : '';
  return (
    <tr
      className={`${border} ${hover} ${cur} ${className}`.trim()}
      onClick={onClick}
      title={title}
    >
      {children}
    </tr>
  );
}

/**
 * Single-line cell: truncate with optional title for full value on hover.
 */
export function AppTableTd({
  children,
  align = 'left',
  title,
  monospace = false,
  truncate = true,
  className = '',
  colSpan,
  rowSpan,
}) {
  const a =
    align === 'right'
      ? 'text-right tabular-nums'
      : align === 'center'
        ? 'text-center'
        : 'text-left';
  const m = monospace ? 'font-mono text-[13px] leading-none' : '';
  const clip = truncate ? 'max-w-[18rem] truncate whitespace-nowrap' : '';
  return (
    <td
      title={title}
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`px-4 py-3 align-middle first:pl-5 last:pr-5 ${a} ${m} ${clip} ${className}`.trim()}
    >
      {children}
    </td>
  );
}

export function AppTablePager({
  showingFrom,
  showingTo,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  pageSize = APP_DATA_TABLE_PAGE_SIZE,
}) {
  if (total === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <p className="font-medium tabular-nums">
        Showing {showingFrom}–{showingTo} of {total}
        {total > pageSize ? ` · ${pageSize} per page` : ''}
      </p>
      {total > pageSize ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-[#134e4a] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-[#134e4a] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
