import React from 'react';
import { Award, Banknote, Shield, Wallet } from 'lucide-react';

/**
 * Procurement-style KPI row for MD Today tab.
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
        className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-left hover:bg-violet-50 transition-colors"
      >
        <p className="text-[9px] font-bold uppercase tracking-wide text-violet-800 flex items-center gap-1">
          <Shield size={12} /> Needs you
        </p>
        <p className="mt-1 text-xl font-black text-violet-950 tabular-nums">{mdOnlyCount ?? 0}</p>
        <p className="mt-2 text-[10px] text-violet-900/80 border-t border-violet-100 pt-2">
          MD-only · {pendingActions ?? 0} total queue
        </p>
      </button>
      <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-teal-700 flex items-center gap-1">
          <Award size={12} /> Champion customer
        </p>
        <p className="mt-1 text-sm font-bold text-[#134e4a] leading-tight line-clamp-2">
          {champion?.customerName ?? '—'}
        </p>
        <p className="mt-2 text-[10px] text-teal-800/90 border-t border-teal-100/80 pt-2">
          {champion?.paidNgn != null && typeof formatNgn === 'function'
            ? `${formatNgn(champion.paidNgn)} collected`
            : 'Top payer this period'}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
          <Wallet size={12} /> Collections
        </p>
        <p className="mt-1 text-xl font-black text-[#134e4a] tabular-nums">
          {typeof formatNgn === 'function' ? formatNgn(collectionsNgn ?? 0) : '—'}
        </p>
        <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">Receipts in period</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
          <Banknote size={12} /> Decide queue
        </p>
        <p className="mt-1 text-xl font-black text-[#134e4a] tabular-nums">{pendingActions ?? 0}</p>
        <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
          Approve without leaving Command Centre
        </p>
      </div>
    </div>
  );
}
