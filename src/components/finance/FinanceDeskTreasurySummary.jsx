import React from 'react';
import { formatNgn } from '../../Data/mockData';

/**
 * Period inflows / outflows / recon — embedded on My desk (merged cashier treasury).
 */
export function FinanceDeskTreasurySummary({
  inflowsNgn = 0,
  outflowsNgn = 0,
  reconciliationCount = 0,
  onGoToReceipts,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="desk-treasury-summary">
      <div className="rounded-xl border border-slate-200/75 bg-white px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.12)]">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cash inflows</p>
        <p className="text-sm font-black text-emerald-700 tabular-nums">{formatNgn(inflowsNgn)}</p>
        <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">Receipts and advance deposits</p>
      </div>
      <div className="rounded-xl border border-slate-200/75 bg-white px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.12)]">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Cash outflows</p>
        <p className="text-sm font-black text-[#134e4a] tabular-nums">{formatNgn(outflowsNgn)}</p>
        <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">Posted from payout queues on this tab</p>
      </div>
      <div className="rounded-xl border border-amber-200/85 bg-amber-50/75 px-3 py-2.5 shadow-[0_10px_36px_-28px_rgba(15,23,42,0.1)]">
        <p className="text-[9px] font-bold text-amber-800 uppercase">Reconciliation</p>
        <p className="text-sm font-black text-amber-900">
          {reconciliationCount} item{reconciliationCount !== 1 ? 's' : ''} to review
        </p>
        {onGoToReceipts ? (
          <button
            type="button"
            onClick={onGoToReceipts}
            className="text-[9px] font-black uppercase text-amber-900 mt-1 underline-offset-2 hover:underline"
          >
            Receipts &amp; recon tab
          </button>
        ) : null}
      </div>
    </div>
  );
}
