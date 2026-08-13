import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { emptyTreasuryDeskBalanceSplit } from '../../lib/financeDeskTreasury';
import { FinanceDeskBalanceBreakdown } from './FinanceDeskBalanceBreakdown';

/**
 * Cashier desk — account balance snapshot at the top of the desk.
 * Main figure is live book balance; payment composition sits just below.
 */
export function FinanceDeskLiquidityHeader({
  bookTotalNgn,
  pendingClearanceNgn,
  clearedBookNgn,
  nextActionSummary,
  balanceSplit,
}) {
  const split = balanceSplit || {
    ...emptyTreasuryDeskBalanceSplit(),
    bookNgn: bookTotalNgn,
    pendingNgn: pendingClearanceNgn,
    confirmedNgn: clearedBookNgn,
    confirmedPlusUnlinkedNgn: clearedBookNgn,
    allTotalNgn: bookTotalNgn,
  };
  const balanceNgn = split.bookNgn ?? bookTotalNgn;

  return (
    <div className="lg:static sticky top-0 z-20 -mx-1 px-1 pb-2 pt-0.5 bg-[var(--color-sequence-bg,#f8fafc)]/95 backdrop-blur-sm border-b border-transparent lg:border-0 lg:backdrop-blur-none lg:bg-transparent">
      <section id="desk-liquidity" className="scroll-mt-16" data-testid="desk-liquidity-header">
        <div className="rounded-zarewa border border-slate-200/80 border-l-[3px] border-l-zarewa-teal bg-white p-5 shadow-[var(--shadow-sequence)]">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
            Balance
          </h3>
          <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
            {formatNgn(balanceNgn)}
          </p>
          <p className="text-ui-xs text-slate-500 font-medium leading-snug mt-1">
            Combined bank, cash &amp; POS account balance
          </p>
          <FinanceDeskBalanceBreakdown split={split} />
          {nextActionSummary ? (
            <p className="mt-3 border-t border-slate-200 pt-2.5 text-xs font-semibold text-zarewa-teal leading-snug">
              {nextActionSummary}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
