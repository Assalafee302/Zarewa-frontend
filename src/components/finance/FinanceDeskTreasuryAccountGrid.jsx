import React from 'react';
import { CreditCard, Landmark } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceActionButton } from './FinanceActionButton';
import { treasuryBookDisplayNgn } from '../../lib/financeDeskTreasury';

/**
 * Treasury-style account cards for Cashier Desk (matches Treasury tab card grid).
 * @param {{
 *   accounts: object[];
 *   bookById: Map<number, number>;
 *   onGoToTab?: (tabId: string) => void;
 *   onAccountClick?: (account: object) => void;
 *   cardActionLabel?: string;
 * }} props
 */
export function FinanceDeskTreasuryAccountGrid({
  accounts = [],
  bookById,
  onGoToTab,
  onAccountClick,
  cardActionLabel,
}) {
  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No treasury accounts</p>
        <p className="text-[11px] text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Landmark size={16} className="text-teal-700" />
          Branch treasury accounts
        </h2>
        {onGoToTab ? (
          <FinanceActionButton variant="link" onClick={() => onGoToTab('treasury')}>
            Manage on treasury
          </FinanceActionButton>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => {
          const balance = treasuryBookDisplayNgn(acc, bookById);
          return (
            <div
              key={acc.id}
              className="rounded-zarewa border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:border-teal-100 transition-all group flex flex-col"
            >
              <button
                type="button"
                onClick={() => {
                  if (onAccountClick) onAccountClick(acc);
                  else onGoToTab?.('treasury');
                }}
                className="text-left p-4 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#134e4a]/30 rounded-t-zarewa"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-[#134e4a]">
                    {acc.type === 'Bank' ? <Landmark size={18} /> : <CreditCard size={18} />}
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                    {acc.accNo || '—'}
                  </span>
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                  {acc.name}
                </p>
                {acc.type === 'Bank' && acc.bankName ? (
                  <p className="text-[9px] text-slate-500 font-semibold mb-1 truncate" title={acc.bankName}>
                    {acc.bankName}
                  </p>
                ) : null}
                <h4 className="text-lg font-black text-[#134e4a] italic tracking-tighter tabular-nums">
                  {formatNgn(balance)}
                </h4>
                <p className="text-[9px] text-teal-700/80 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {cardActionLabel || (onAccountClick ? 'View statement' : 'View on treasury')}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
