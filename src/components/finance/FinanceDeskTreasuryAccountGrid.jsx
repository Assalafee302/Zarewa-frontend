import React from 'react';
import { CreditCard, Landmark } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceDeskBalanceBreakdown } from './FinanceDeskBalanceBreakdown';
import {
  emptyTreasuryDeskBalanceSplit,
  treasuryBookDisplayNgn,
  treasuryDeskBalanceForAccount,
} from '../../lib/financeDeskTreasury';

/**
 * Treasury-style account cards for Cashier Desk (matches Treasury tab card grid).
 * Main figure is live account balance; confirmed / unlinked / all totals sit just below.
 * @param {{
 *   accounts: object[];
 *   bookById: Map<number, number>;
 *   balanceByAccountId?: Map<number, object>;
 *   onGoToTab?: (tabId: string) => void;
 *   onAccountClick?: (account: object) => void;
 *   cardActionLabel?: string;
 * }} props
 */
export function FinanceDeskTreasuryAccountGrid({
  accounts = [],
  bookById,
  balanceByAccountId,
  onGoToTab,
  onAccountClick,
  cardActionLabel,
  nextActionSummary,
}) {
  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No treasury accounts</p>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          Register branch bank or till accounts on the Treasury tab.
        </p>
        {onGoToTab ? (
          <div className="mt-3">
            <FinanceActionButton variant="link" onClick={() => onGoToTab('treasury')}>
              Open treasury
            </FinanceActionButton>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section id="desk-accounts" className="space-y-3 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Landmark size={16} className="text-teal-700" />
          Branch treasury accounts
        </h2>
        {onGoToTab && !onAccountClick ? (
          <FinanceActionButton variant="link" onClick={() => onGoToTab('treasury')}>
            Manage on treasury
          </FinanceActionButton>
        ) : null}
      </div>
      {nextActionSummary ? (
        <p className="text-xs font-semibold text-zarewa-teal leading-snug">{nextActionSummary}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {accounts.map((acc) => {
          const book = treasuryBookDisplayNgn(acc, bookById);
          const split = balanceByAccountId
            ? treasuryDeskBalanceForAccount(balanceByAccountId, acc)
            : {
                ...emptyTreasuryDeskBalanceSplit(),
                bookNgn: book,
                confirmedNgn: book,
                confirmedPlusUnlinkedNgn: book,
                allTotalNgn: book,
              };
          const balance = split.allTotalNgn;
          return (
            <div
              key={acc.id}
              className="rounded-xl border border-slate-200/80 bg-white hover:border-teal-200 hover:shadow-sm transition-all group flex flex-col min-w-0"
            >
              <button
                type="button"
                onClick={() => {
                  if (onAccountClick) onAccountClick(acc);
                  else onGoToTab?.('treasury');
                }}
                className="text-left p-2.5 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/30 rounded-xl min-w-0"
              >
                <div className="flex justify-between items-start gap-1 mb-1">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-zarewa-teal">
                    {acc.type === 'Bank' ? <Landmark size={14} /> : <CreditCard size={14} />}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums truncate">
                    {acc.accNo || '—'}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800 truncate" title={acc.name}>
                  {acc.name}
                </p>
                {acc.type === 'Bank' && acc.bankName ? (
                  <p className="text-[10px] text-slate-500 truncate" title={acc.bankName}>
                    {acc.bankName}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-bold tabular-nums text-zarewa-teal tracking-tight">
                  {formatNgn(balance)}
                </p>
                <FinanceDeskBalanceBreakdown split={split} compact />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
