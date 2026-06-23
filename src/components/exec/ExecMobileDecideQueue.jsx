import React from 'react';
import { ChevronRight, Shield } from 'lucide-react';
import {
  approvalTierChipClass,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../../lib/execApprovalTier';

function tierChip(tier) {
  if (tier === EXEC_APPROVAL_TIER_MD_ONLY) return approvalTierChipClass(tier);
  if (tier === EXEC_APPROVAL_TIER_SHARED) return approvalTierChipClass(tier);
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function priorityDot(p) {
  if (p === 'high') return 'bg-rose-500';
  if (p === 'medium') return 'bg-amber-500';
  return 'bg-slate-300';
}

/**
 * Touch-first approval queue for MD mobile PWA.
 */
export function ExecMobileDecideQueue({
  items = [],
  busy,
  readOnly,
  workTrayFilter,
  onWorkTrayFilterChange,
  mdOnlyCount = 0,
  sharedCount = 0,
  onReview,
  formatNgn,
}) {
  const actionable = items.filter((row) => !row.summaryOnly);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 bg-white">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'md_only', label: `Needs you (${mdOnlyCount})` },
            { id: 'all', label: `All (${mdOnlyCount + sharedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onWorkTrayFilterChange?.(f.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-[11px] font-black uppercase ring-1 ${
                workTrayFilter === f.id
                  ? f.id === 'md_only'
                    ? 'bg-violet-700 text-white ring-violet-700'
                    : 'bg-[#134e4a] text-white ring-[#134e4a]'
                  : 'bg-white text-slate-700 ring-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {busy && actionable.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : null}

        {!busy && actionable.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-8 text-center">
            <Shield size={28} className="mx-auto text-emerald-700 mb-2" />
            <p className="text-sm font-bold text-emerald-950">Queue clear</p>
            <p className="text-[11px] text-emerald-800/90 mt-1">No items need your decision right now.</p>
          </div>
        ) : null}

        {actionable.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="h-1 bg-[#134e4a]" aria-hidden />
            <div className="p-4">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot(row.priority)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[8px] font-black uppercase ring-1 ${tierChip(row.approvalTier)}`}
                    >
                      {row.approvalTierLabel || row.approvalTier || 'Queue'}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400">
                      {String(row.kind || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-snug">{row.title || 'Review'}</h3>
                  <p className="text-[12px] text-slate-500 mt-1">
                    {row.branchName || '—'}
                    {row.amountNgn != null ? ` · ${formatNgn(row.amountNgn)}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {row.requestedBy ? `${row.requestedBy} · ` : ''}
                    {row.ageLabel || row.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onReview?.(row)}
                disabled={readOnly && row.canAct === false}
                className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#134e4a] px-4 py-3 text-[11px] font-black uppercase text-white shadow-sm hover:brightness-105 disabled:opacity-40"
              >
                {row.canAct === false ? 'View' : 'Review & approve'}
                <ChevronRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
