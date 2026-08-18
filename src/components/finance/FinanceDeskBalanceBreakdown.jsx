import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { emptyTreasuryDeskBalanceSplit } from '../../lib/financeDeskTreasury';

/**
 * Confirmed (linked) balance, confirmed+unlinked balance, and all-total under each account.
 */
export function FinanceDeskBalanceBreakdown({ split, compact = false }) {
  const s = split || emptyTreasuryDeskBalanceSplit();
  if (compact) {
    return (
      <p className="mt-0.5 text-[10px] leading-snug text-slate-500 tabular-nums">
        Confirmed {formatNgn(s.confirmedNgn)}
        <span className="text-slate-300"> · </span>
        All {formatNgn(s.allTotalNgn)}
      </p>
    );
  }
  const rowClass = 'flex items-center justify-between gap-2 text-xs text-slate-600';
  return (
    <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2.5">
      <p className={rowClass} title="This account's remaining balance from cashier-confirmed, customer-linked payments">
        <span>Confirmed balance</span>
        <span className="font-bold tabular-nums text-emerald-700">{formatNgn(s.confirmedNgn)}</span>
      </p>
      <p className={rowClass} title="Confirmed linked balance plus unlinked bank deposits still on this account">
        <span>Confirmed + unlinked</span>
        <span className="font-bold tabular-nums text-sky-800">{formatNgn(s.confirmedPlusUnlinkedNgn)}</span>
      </p>
      <p className={rowClass} title="Full live balance on this account, including draft receipts">
        <span>All total</span>
        <span className="font-black tabular-nums text-slate-800">{formatNgn(s.allTotalNgn)}</span>
      </p>
    </div>
  );
}
