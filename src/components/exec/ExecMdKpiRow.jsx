import React from 'react';
import { Award, Banknote, Shield, Wallet } from 'lucide-react';

const KPI_CARD =
  'rounded-xl border border-slate-200/90 bg-white shadow-sm p-4 text-left transition-colors hover:border-zarewa-teal/20';

/**
 * KPI row for MD Today tab — matches Sales stat card pattern.
 */
export function ExecMdKpiRow({
  mdOnlyCount,
  pendingActions,
  champion,
  collectionsNgn,
  formatNgn,
  onOpenDecide,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <button
        type="button"
        onClick={onOpenDecide}
        className={`${KPI_CARD} border-violet-200/90 bg-violet-50/40 hover:bg-violet-50/60`}
      >
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-violet-800 flex items-center gap-1.5">
          <Shield size={14} strokeWidth={2} /> Needs you
        </p>
        <p className="mt-2 text-2xl font-black text-violet-950 tabular-nums">{mdOnlyCount ?? 0}</p>
        <p className="mt-2 text-ui-xs text-violet-900/80 border-t border-violet-100 pt-2">
          MD-only · {pendingActions ?? 0} total queue
        </p>
      </button>
      <div className={`${KPI_CARD} border-teal-200/90 bg-teal-50/30`}>
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-teal-700 flex items-center gap-1.5">
          <Award size={14} strokeWidth={2} /> Champion customer
        </p>
        <p className="mt-2 text-sm font-bold text-zarewa-teal leading-tight line-clamp-2">
          {champion?.customerName ?? '—'}
        </p>
        <p className="mt-2 text-ui-xs text-teal-800/90 border-t border-teal-100/80 pt-2">
          {champion?.paidNgn != null && typeof formatNgn === 'function'
            ? `${formatNgn(champion.paidNgn)} collected`
            : 'Top payer this period'}
        </p>
      </div>
      <div className={KPI_CARD}>
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Wallet size={14} strokeWidth={2} /> Collections
        </p>
        <p className="mt-2 text-2xl font-black text-zarewa-teal tabular-nums">
          {typeof formatNgn === 'function' ? formatNgn(collectionsNgn ?? 0) : '—'}
        </p>
        <p className="mt-2 text-ui-xs text-slate-500 border-t border-slate-100 pt-2">Receipts in period</p>
      </div>
      <button type="button" onClick={onOpenDecide} className={KPI_CARD}>
        <p className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Banknote size={14} strokeWidth={2} /> Decide queue
        </p>
        <p className="mt-2 text-2xl font-black text-zarewa-teal tabular-nums">{pendingActions ?? 0}</p>
        <p className="mt-2 text-ui-xs text-slate-500 border-t border-slate-100 pt-2">
          Approve without leaving MD Office
        </p>
      </button>
    </div>
  );
}
