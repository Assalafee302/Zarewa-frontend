import React from 'react';
import {
  approvalTierChipClass,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../../lib/execApprovalTier';
import { EXEC_CARD_ROW, EXEC_CHIP, EXEC_COMPACT_ACTION_BTN } from '../../lib/execPageUi';
import { SalesListSearchInput, SalesListTableFrame } from '../sales/SalesListTableFrame';

function approvalTierChip(tier) {
  if (tier === EXEC_APPROVAL_TIER_MD_ONLY) return approvalTierChipClass(tier);
  if (tier === EXEC_APPROVAL_TIER_SHARED) return approvalTierChipClass(tier);
  return 'bg-slate-100 text-slate-700 ring-slate-200 border-slate-200';
}

function compactChip(extra) {
  return `inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${extra}`;
}

function priorityChip(p) {
  if (p === 'high') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (p === 'medium') return 'border-amber-200 bg-amber-50 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function workTrayActionLabel(row, readOnly) {
  const canAct = row.canAct && !readOnly && !row.summaryOnly;
  return row.summaryOnly ? 'View' : canAct ? 'Review' : 'View';
}

function WorkTrayCard({ row, readOnly, onReview, formatNgn }) {
  const amount =
    row.amountNgn != null && typeof formatNgn === 'function' ? formatNgn(row.amountNgn) : '';
  const meta = [row.branchName, amount, row.ageLabel || row.status].filter(Boolean).join(' · ');

  return (
    <article
      className={`${EXEC_CARD_ROW} py-2 ${
        row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY ? 'border-violet-200/80 bg-violet-50/30' : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1">
            <span className={compactChip(approvalTierChip(row.approvalTier))}>
              {row.approvalTierLabel || 'Review'}
            </span>
            <span className={compactChip(priorityChip(row.priority))}>{row.priority}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {String(row.kind || '').replace(/_/g, ' ')}
            </span>
          </div>
          <h3 className="truncate text-[13px] font-semibold leading-snug text-slate-900">
            {row.title || 'Review'}
          </h3>
          {meta ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onReview?.(row)}
          className={EXEC_COMPACT_ACTION_BTN}
        >
          {workTrayActionLabel(row, readOnly)}
        </button>
      </div>
    </article>
  );
}

/**
 * Executive work tray — compact cards below xl, table on wide screens.
 */
export function ExecWorkTrayPanel({
  title,
  subtitle,
  items = [],
  busy,
  readOnly,
  workTrayFilter,
  onWorkTrayFilterChange,
  mdOnlyCount = 0,
  sharedCount = 0,
  onReview,
  compact = false,
  search = '',
  onSearchChange,
  formatNgn,
}) {
  const showFilters = !compact && typeof onWorkTrayFilterChange === 'function';
  const displayItems = compact ? items.slice(0, 7) : items;

  const filterBtn = (id, label, activeClass) => (
    <button
      key={id}
      type="button"
      onClick={() => onWorkTrayFilterChange(id)}
      className={`min-h-8 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide ring-1 transition-colors ${
        workTrayFilter === id
          ? activeClass
          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  const toolbar = (
    <div className="flex flex-col gap-3">
      {title ? (
        <div>
          <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500 mt-1 leading-snug">{subtitle}</p> : null}
        </div>
      ) : null}
      {showFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {filterBtn('all', `All (${mdOnlyCount + sharedCount})`, 'bg-zarewa-teal text-white ring-zarewa-teal')}
          {filterBtn(
            'md_only',
            `Needs you (${mdOnlyCount})`,
            'bg-violet-700 text-white ring-violet-700'
          )}
          {filterBtn(
            'shared',
            `BM / Finance (${sharedCount})`,
            'bg-sky-700 text-white ring-sky-700'
          )}
        </div>
      ) : null}
      {compact ? null : (
        <SalesListSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search queue by title, branch, type…"
        />
      )}
    </div>
  );

  return (
    <SalesListTableFrame toolbar={toolbar}>
      {busy && displayItems.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : null}

      {!busy && displayItems.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">No pending executive items.</p>
      ) : null}

      <div className="xl:hidden space-y-1.5">
        {displayItems.map((row) => (
          <WorkTrayCard
            key={row.id}
            row={row}
            readOnly={readOnly}
            onReview={onReview}
            formatNgn={formatNgn}
          />
        ))}
      </div>

      <div className="hidden xl:block overflow-x-auto -mx-1">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-ui-xs font-bold uppercase tracking-widest text-slate-400">
              <th className="py-2 text-left font-bold">Priority</th>
              <th className="py-2 text-left font-bold">Approver</th>
              <th className="py-2 text-left font-bold">Type</th>
              <th className="py-2 text-left font-bold">Branch</th>
              <th className="py-2 text-right font-bold">Amount</th>
              <th className="py-2 text-left font-bold">Age</th>
              <th className="py-2 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-slate-50 ${
                  row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY ? 'bg-violet-50/30' : ''
                }`}
              >
                <td className="py-2.5">
                  <span className={`${EXEC_CHIP} ${priorityChip(row.priority)}`}>{row.priority}</span>
                </td>
                <td className="py-2.5">
                  <span className={`${EXEC_CHIP} ${approvalTierChip(row.approvalTier)}`}>
                    {row.approvalTierLabel || 'Review'}
                  </span>
                </td>
                <td className="py-2.5 font-semibold capitalize text-slate-800">
                  {String(row.kind || '').replace(/_/g, ' ')}
                </td>
                <td className="py-2.5 text-slate-700">{row.branchName}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold text-slate-800">
                  {row.amountNgn != null && typeof formatNgn === 'function'
                    ? formatNgn(row.amountNgn)
                    : '—'}
                </td>
                <td className="py-2.5 text-slate-600">{row.ageLabel}</td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onReview?.(row)}
                    className={EXEC_COMPACT_ACTION_BTN}
                  >
                    {workTrayActionLabel(row, readOnly)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SalesListTableFrame>
  );
}
