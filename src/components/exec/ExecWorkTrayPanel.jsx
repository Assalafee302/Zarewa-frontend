import React from 'react';
import { Shield } from 'lucide-react';
import {
  approvalTierChipClass,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../../lib/execApprovalTier';
import { SalesListSearchInput, SalesListTableFrame } from '../sales/SalesListTableFrame';

function approvalTierChip(tier) {
  if (tier === EXEC_APPROVAL_TIER_MD_ONLY) return approvalTierChipClass(tier);
  if (tier === EXEC_APPROVAL_TIER_SHARED) return approvalTierChipClass(tier);
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function priorityChip(p) {
  if (p === 'high') return 'bg-rose-100 text-rose-900 ring-rose-200';
  if (p === 'medium') return 'bg-amber-100 text-amber-950 ring-amber-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function ScopeChip({ basis }) {
  if (basis !== 'company') return null;
  return (
    <span className="ml-1 rounded px-1 py-0.5 text-[8px] font-bold uppercase bg-slate-100 text-slate-600">
      HQ
    </span>
  );
}

/**
 * Executive work tray — full Decide list or compact Today preview.
 */
export function ExecWorkTrayPanel({
  title = 'Executive Work Tray',
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

  const toolbar = (
    <div className="flex flex-col gap-3">
      {showFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${mdOnlyCount + sharedCount})` },
            { id: 'md_only', label: `MD only (${mdOnlyCount})` },
            { id: 'shared', label: `BM / Finance (${sharedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onWorkTrayFilterChange(f.id)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ring-1 ${
                workTrayFilter === f.id
                  ? f.id === 'md_only'
                    ? 'bg-violet-700 text-white ring-violet-700'
                    : f.id === 'shared'
                      ? 'bg-sky-700 text-white ring-sky-700'
                      : 'bg-[#134e4a] text-white ring-[#134e4a]'
                  : f.id === 'md_only'
                    ? `${approvalTierChip(EXEC_APPROVAL_TIER_MD_ONLY)} hover:opacity-90`
                    : f.id === 'shared'
                      ? `${approvalTierChip(EXEC_APPROVAL_TIER_SHARED)} hover:opacity-90`
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          {mdOnlyCount > 0 ? (
            <p className="text-[10px] text-violet-900 font-semibold ml-1">
              {mdOnlyCount} item{mdOnlyCount === 1 ? '' : 's'} need your sign-off only.
            </p>
          ) : null}
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

  const displayItems = compact ? items.slice(0, 7) : items;

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="h-1 bg-[#134e4a]" aria-hidden />
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className="flex items-start gap-2">
          <Shield size={18} className="text-[#134e4a] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-[#134e4a]">{title}</h2>
            {subtitle ? <p className="text-[11px] text-slate-500 mt-1 leading-snug">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <SalesListTableFrame toolbar={toolbar}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[880px]">
            <thead>
              <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                <th className="py-2 text-left">Priority</th>
                <th className="py-2 text-left">Approver</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Branch</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-left">Age</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 && !busy ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No pending executive items.
                  </td>
                </tr>
              ) : (
                displayItems.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-50 ${
                      row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY ? 'bg-violet-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${priorityChip(row.priority)}`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${approvalTierChip(row.approvalTier)}`}
                      >
                        {row.approvalTierLabel || 'Review'}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold capitalize">
                      {String(row.kind || '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5">
                      {row.branchName}
                      <ScopeChip basis={row.scopeBasis} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.amountNgn != null && typeof formatNgn === 'function'
                        ? formatNgn(row.amountNgn)
                        : '—'}
                    </td>
                    <td className="py-2.5">{row.ageLabel}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onReview?.(row)}
                        className="rounded-lg border border-[#134e4a]/30 bg-[#134e4a]/5 px-3 py-1.5 text-[10px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
                      >
                        {row.summaryOnly ? 'View' : row.canAct && !readOnly ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SalesListTableFrame>
    </section>
  );
}
