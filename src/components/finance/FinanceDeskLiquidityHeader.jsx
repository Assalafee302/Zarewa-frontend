import React from 'react';
import { formatNgn } from '../../Data/mockData';

/**
 * Cashier desk — liquidity snapshot (Treasury left-rail pattern, full-width on Desk).
 * Sticky on mobile so cashiers keep balances visible while scrolling queues.
 */
export function FinanceDeskLiquidityHeader({
  bookTotalNgn,
  pendingClearanceNgn,
  clearedBookNgn,
  nextActionSummary,
}) {
  return (
    <div className="lg:static sticky top-0 z-20 -mx-1 px-1 pb-2 pt-0.5 bg-[var(--color-sequence-bg,#f8fafc)]/95 backdrop-blur-sm border-b border-transparent lg:border-0 lg:backdrop-blur-none lg:bg-transparent">
      <section id="desk-liquidity" className="grid grid-cols-1 gap-3 sm:grid-cols-3 scroll-mt-16">
        <div className="rounded-zarewa border border-slate-200/80 border-l-[3px] border-l-[#134e4a] bg-white p-5 shadow-[var(--shadow-sequence)] sm:col-span-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
            Total liquidity
          </h3>
          <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
            {formatNgn(bookTotalNgn)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium leading-snug mt-1">
            Combined bank, cash &amp; POS floats
          </p>
          {nextActionSummary ? (
            <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] font-semibold text-[#134e4a] leading-snug">
              {nextActionSummary}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-emerald-200/75 bg-emerald-50/50 px-4 py-3.5 shadow-sm">
          <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-wide">Cleared book</p>
          <p className="text-lg font-black text-emerald-800 tabular-nums mt-0.5">{formatNgn(clearedBookNgn)}</p>
          <p className="text-[9px] text-emerald-900/75 mt-1 leading-snug">After pending receipt clearance</p>
        </div>
        <div className="rounded-xl border border-amber-200/85 bg-amber-50/75 px-4 py-3.5 shadow-sm">
          <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wide">Pending clearance</p>
          <p className="text-lg font-black text-amber-900 tabular-nums mt-0.5">{formatNgn(pendingClearanceNgn)}</p>
          <p className="text-[9px] text-amber-900/75 mt-1 leading-snug">Receipts not yet confirmed by finance</p>
        </div>
      </section>
    </div>
  );
}
