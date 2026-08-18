import React from 'react';
import { CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { treasuryAccountBranchLabel } from '../../lib/treasuryAccountsStore';
import { FinanceDeskBalanceBreakdown } from './FinanceDeskBalanceBreakdown';
import {
  emptyTreasuryDeskBalanceSplit,
  treasuryDeskBalanceForAccount,
} from '../../lib/financeDeskTreasury';

/**
 * Manage branch bank/till accounts on Finance desk (treasury admin tools).
 */
export function FinanceTreasuryManageAccountsPanel({
  workspaceBranchLabel,
  accounts = [],
  bankAccountsVisibleCount = 0,
  bookDisplayNgn,
  branchNameById,
  workspaceBranchId,
  showAllTreasuryInTab = false,
  canManageTreasury = false,
  canMutate = false,
  canExecTreasuryDelete = false,
  onOpenStatement,
  onEditAccount,
  onRemoveAccount,
  balanceByAccountId,
}) {
  return (
    <section className="space-y-3 scroll-mt-20" data-testid="finance-desk-manage-accounts">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {accounts.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 z-empty-state py-12">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {bankAccountsVisibleCount === 0
                ? workspaceBranchLabel
                  ? `No treasury accounts for ${workspaceBranchLabel}`
                  : 'No treasury accounts in this workspace'
                : 'No accounts match your search'}
            </p>
            {bankAccountsVisibleCount === 0 && workspaceBranchLabel && canManageTreasury ? (
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Use <strong>New account</strong> above to add this branch&apos;s bank or cash till. Existing Yola
                accounts stay on the Yola workspace; Maiduguri needs its own accounts here.
              </p>
            ) : null}
          </div>
        ) : (
          accounts.map((acc) => {
            const book = bookDisplayNgn?.(acc) ?? acc.balance ?? 0;
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
                onClick={() => onOpenStatement?.(acc)}
                className="text-left p-2.5 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/30 rounded-t-xl min-w-0"
              >
                <div className="flex justify-between items-start gap-1 mb-1">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-zarewa-teal">
                    {acc.type === 'Bank' ? <Landmark size={14} /> : <CreditCard size={14} />}
                  </div>
                  <div className="text-right min-w-0">
                    {(showAllTreasuryInTab || String(acc.branchId || '') !== workspaceBranchId) && acc.branchId ? (
                      <span className="block text-[10px] font-semibold text-sky-800 truncate">
                        {treasuryAccountBranchLabel(acc.branchId, branchNameById)}
                      </span>
                    ) : null}
                    <span className="block text-[10px] font-semibold text-slate-400 tabular-nums truncate">
                      {acc.accNo || '—'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-800 truncate" title={acc.name}>{acc.name}</p>
                {acc.type === 'Bank' && acc.bankName ? (
                  <p className="text-[10px] text-slate-500 truncate" title={acc.bankName}>
                    {acc.bankName}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-bold tabular-nums text-zarewa-teal tracking-tight">
                  {formatNgn(balance)}
                </p>
                <FinanceDeskBalanceBreakdown split={split} compact />
                {acc.accountOfficerName || acc.accountOfficerPhone ? (
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {acc.accountOfficerName || ''}
                    {acc.accountOfficerName && acc.accountOfficerPhone ? ' · ' : ''}
                    {acc.accountOfficerPhone || ''}
                  </p>
                ) : null}
              </button>
              {(canManageTreasury && canMutate) || canExecTreasuryDelete ? (
                <div className="flex items-center justify-end gap-1 px-2 pb-2 pt-0 border-t border-slate-100">
                  {canManageTreasury && canMutate ? (
                    <button
                      type="button"
                      onClick={() => onEditAccount?.(acc)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  ) : null}
                  {canExecTreasuryDelete ? (
                    <button
                      type="button"
                      onClick={() => onRemoveAccount?.(acc)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-[0.28] hover:opacity-100 hover:text-rose-600 hover:bg-rose-50/30 transition-all"
                      title="Remove account (Admin, MD, or CEO only; balance must be ₦0 and no history)"
                      aria-label="Delete treasury account"
                    >
                      <Trash2 size={13} strokeWidth={1.65} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}
