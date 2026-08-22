/* eslint-disable react-refresh/only-export-components -- row class tokens colocated with the list row */
import React from 'react';

/** Compact rows — aligned with Stock / Ops / Finance / Procurement */
export const SALES_CARD_ROW =
  'rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 shadow-sm transition-colors hover:bg-slate-50';

/** Phone 14px titles; laptop stays compact. Money is teal; IDs stay slate/mono. */
export const SALES_ROW_ID = 'z-stencil font-semibold text-slate-800 text-sm lg:text-xs';
export const SALES_ROW_CUSTOMER = 'font-medium text-slate-600 text-sm lg:text-xs';
export const SALES_ROW_AMOUNT = 'font-semibold tabular-nums text-slate-900 text-sm lg:text-xs';

/** Lift row above following siblings so overflow action menus paint on top. */
export function salesListItemClass(rowKey, openKey) {
  return openKey === rowKey ? `${SALES_CARD_ROW} relative z-50` : SALES_CARD_ROW;
}

/**
 * Sales list row: the body opens View; the kebab stays a separate control.
 */
export function SalesListRow({ rowKey, openKey, onView, viewLabel, menu, children, testId }) {
  return (
    <li className={salesListItemClass(rowKey, openKey)} data-testid={testId}>
      <div className="flex items-start gap-1 min-w-0">
        <button
          type="button"
          onClick={onView}
          aria-label={viewLabel}
          className="min-w-0 flex-1 cursor-pointer rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30"
        >
          {children}
        </button>
        <div className="shrink-0 pt-0.5">{menu}</div>
      </div>
    </li>
  );
}

/**
 * Phone cards + laptop table for the same records. Keep `renderCard` compact; put
 * scan columns in `renderCells` (tabular amounts right-aligned via header.align).
 */
export function SalesRecordsView({
  caption,
  headers,
  items,
  itemKey,
  openKey,
  onView,
  viewLabel,
  renderMenu,
  renderCard,
  renderCells,
  testId,
}) {
  return (
    <>
      <ul className="space-y-1.5 lg:hidden">
        {items.map((item) => {
          const key = itemKey(item);
          return (
            <SalesListRow
              key={key}
              rowKey={key}
              openKey={openKey}
              onView={() => onView(item)}
              viewLabel={viewLabel(item)}
              testId={testId?.(item)}
              menu={renderMenu(item)}
            >
              {renderCard(item)}
            </SalesListRow>
          );
        })}
      </ul>
      <div className="hidden lg:block overflow-x-auto -mx-1">
        <table className="w-full min-w-[640px] text-left text-xs border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-slate-200 bg-slate-50/90">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  className={`px-2.5 py-2 text-ui-xs font-medium text-slate-500 ${
                    h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const key = itemKey(item);
              const cells = renderCells(item);
              const lifted = openKey === key;
              const label = viewLabel(item);
              const firstKey = headers.find((h) => h.key !== 'actions')?.key;
              return (
                <tr
                  key={key}
                  data-testid={testId?.(item)}
                  className={`hover:bg-slate-50/90 ${lifted ? 'relative z-50 bg-slate-50' : ''}`}
                >
                  {headers.map((h) => {
                    if (h.key === 'actions') {
                      return (
                        <td key={h.key} className="px-1.5 py-1.5 text-right align-middle w-12">
                          {renderMenu(item)}
                        </td>
                      );
                    }
                    const align = h.align === 'right' ? 'text-right tabular-nums' : '';
                    if (h.key === firstKey) {
                      return (
                        <td key={h.key} className={`px-2.5 py-2 align-middle ${align}`}>
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            className="w-full cursor-pointer rounded-md text-left font-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30"
                            aria-label={label}
                          >
                            {cells[h.key]}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={h.key}
                        className={`px-2.5 py-2 align-middle cursor-pointer ${align}`}
                        onClick={() => onView(item)}
                      >
                        {cells[h.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
