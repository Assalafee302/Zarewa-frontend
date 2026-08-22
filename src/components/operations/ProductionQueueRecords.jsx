/* eslint-disable react-refresh/only-export-components -- live job coil detail helper colocated with the table */
import React from 'react';
import { SALES_STATUS_CHIP } from '../../lib/salesStatusUi';
import { productionQueueRowTone } from './productionQueueFilters';

/** Phone 14px titles; laptop stays compact. IDs stay slate/mono. */
export const OPS_ROW_ID = 'z-stencil font-semibold text-slate-800 text-sm lg:text-xs';
export const OPS_ROW_CUSTOMER = 'font-medium text-slate-600 text-sm lg:text-xs';

const CARD_ROW =
  'rounded-md border border-slate-200/80 bg-white py-2.5 px-3 transition-colors hover:border-teal-200/70 hover:bg-slate-50/70';

const CHIP = SALES_STATUS_CHIP;

function productionListItemClass(rowKey, openKey, toneClass = '') {
  const base = toneClass
    ? `rounded-md border py-2.5 px-3 transition-colors hover:brightness-[0.99] ${toneClass}`
    : CARD_ROW;
  return openKey === rowKey ? `${base} relative z-50` : base;
}

const LIVE_HEADERS = [
  { key: 'id', label: 'List' },
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'detail', label: 'Coil' },
  { key: 'actions', label: 'Actions' },
];

const CLOSED_HEADERS = [
  { key: 'id', label: 'List' },
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'detail', label: 'Detail' },
  { key: 'actions', label: 'Actions' },
];

function StatusChips({ item, extra }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`${CHIP} ${item.lineStatusChipClass || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
        {item.lineStatusLabel || '—'}
      </span>
      {extra}
    </span>
  );
}

function closedPriorityChip(item) {
  const showPriority =
    item.priority &&
    item.priority !== 'Done' &&
    item.priority !== 'Normal' &&
    String(item.priority).toLowerCase() !== String(item.lineStatusLabel || '').toLowerCase();
  if (!showPriority) return null;
  return (
    <span
      className={`${CHIP} ${
        item.priority === 'High'
          ? 'border-red-200 bg-red-50 text-red-700'
          : item.priority === 'Cancelled'
            ? 'border-slate-300 bg-slate-100 text-slate-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {item.priority}
    </span>
  );
}

/**
 * Phone cards + laptop table for Register queues. Row body / ID cell opens View;
 * kebab stays a separate control.
 */
export function ProductionQueueRecords({
  kind,
  caption,
  items,
  itemKey,
  openKey,
  onView,
  viewLabel,
  renderMenu,
  detailOf,
}) {
  const headers = kind === 'closed' ? CLOSED_HEADERS : LIVE_HEADERS;

  return (
    <>
      <ul className="space-y-1.5 lg:hidden">
        {items.map((item) => {
          const key = itemKey(item);
          const detail = detailOf(item);
          const extra = kind === 'closed' ? closedPriorityChip(item) : null;
          return (
            <li key={key} className={productionListItemClass(key, openKey, productionQueueRowTone(item))}>
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onView(item)}
                  aria-label={viewLabel(item)}
                  className="min-w-0 flex-1 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/25"
                >
                  <p className="truncate min-w-0">
                    <span className={OPS_ROW_ID}>{item.id}</span>
                    <span className="font-normal text-slate-400"> · </span>
                    <span className={OPS_ROW_CUSTOMER}>{item.customer}</span>
                  </p>
                  {detail ? (
                    <p
                      className={`mt-0.5 text-ui-xs truncate ${
                        kind === 'live' && !item.hasCoilsAllocated ? 'text-amber-800' : 'text-slate-500'
                      }`}
                      title={detail}
                    >
                      {detail}
                    </p>
                  ) : null}
                </button>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <StatusChips item={item} extra={extra} />
                  {renderMenu(item)}
                </div>
              </div>
            </li>
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
                    h.key === 'actions' ? 'text-right' : 'text-left'
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
              const label = viewLabel(item);
              const detail = detailOf(item);
              const extra = kind === 'closed' ? closedPriorityChip(item) : null;
              const tone = productionQueueRowTone(item);
              const lifted = openKey === key;
              const cells = {
                id: <span className={OPS_ROW_ID}>{item.id}</span>,
                customer: (
                  <span className={`${OPS_ROW_CUSTOMER} truncate block max-w-[14rem]`}>{item.customer}</span>
                ),
                status: <StatusChips item={item} extra={extra} />,
                detail: detail ? (
                  <span
                    className={`text-ui-xs line-clamp-2 ${
                      kind === 'live' && !item.hasCoilsAllocated ? 'text-amber-800' : 'text-slate-500'
                    }`}
                    title={detail}
                  >
                    {detail}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                ),
              };
              return (
                <tr
                  key={key}
                  className={`hover:bg-slate-50/90 ${tone} ${lifted ? 'relative z-50 bg-slate-50' : ''}`}
                >
                  {headers.map((h) => {
                    if (h.key === 'actions') {
                      return (
                        <td key={h.key} className="px-1.5 py-1.5 text-right align-middle w-12">
                          {renderMenu(item)}
                        </td>
                      );
                    }
                    if (h.key === 'id') {
                      return (
                        <td key={h.key} className="px-2.5 py-2 align-middle">
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            className="w-full cursor-pointer rounded-md text-left font-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30"
                            aria-label={label}
                          >
                            {cells.id}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={h.key}
                        className="px-2.5 py-2 align-middle cursor-pointer"
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

export function liveJobCoilDetail(item) {
  if (item.hasCoilsAllocated) {
    return [
      item.reservedCoilNos?.length ? item.reservedCoilNos.join(' · ') : item.coilLabel || 'Coils allocated',
      item.reservedKg > 0
        ? `${item.reservedKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return item.coilLabel || '';
}
