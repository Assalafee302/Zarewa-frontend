import React from 'react';
import { CreditCard, Landmark, Pencil, Trash2 } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { treasuryAccountBranchLabel } from '../../lib/treasuryAccountsStore';

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
}) {
  return (
    <section className="space-y-3 scroll-mt-20" data-testid="finance-desk-manage-accounts">
      {workspaceBranchLabel ? (
        <p className="text-xs text-slate-600 leading-relaxed rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          Bank and cash accounts shown here belong to{' '}
          <strong className="text-zarewa-teal">{workspaceBranchLabel}</strong>. Switch workspace to Yola or Maiduguri
          to manage that branch&apos;s treasury, then use <strong>New account</strong> to register local bank or till
          accounts.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-zarewa border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:border-teal-100 transition-all group flex flex-col"
            >
              <button
                type="button"
                onClick={() => onOpenStatement?.(acc)}
                className="text-left p-4 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/30 rounded-t-zarewa"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-zarewa-teal">
                    {acc.type === 'Bank' ? <Landmark size={18} /> : <CreditCard size={18} />}
                  </div>
                  <div className="text-right">
                    {(showAllTreasuryInTab || String(acc.branchId || '') !== workspaceBranchId) && acc.branchId ? (
                      <span className="block text-ui-xs font-bold text-sky-800 uppercase tracking-wide mb-0.5">
                        {treasuryAccountBranchLabel(acc.branchId, branchNameById)}
                      </span>
                    ) : null}
                    <span className="text-ui-xs font-bold text-gray-400 uppercase tracking-tighter">
                      {acc.accNo || '—'}
                    </span>
                  </div>
                </div>
                <p className="text-ui-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">{acc.name}</p>
                {acc.type === 'Bank' && acc.bankName ? (
                  <p className="text-ui-xs text-slate-500 font-semibold mb-1 truncate" title={acc.bankName}>
                    {acc.bankName}
                  </p>
                ) : null}
                <h4 className="text-lg font-black text-zarewa-teal italic tracking-tighter tabular-nums">
                  {formatNgn(bookDisplayNgn?.(acc) ?? acc.balance ?? 0)}
                </h4>
                {acc.accountOfficerName || acc.accountOfficerPhone ? (
                  <p className="text-ui-xs text-slate-600 mt-2 leading-snug line-clamp-2">
                    {acc.accountOfficerName ? (
                      <span className="font-semibold">{acc.accountOfficerName}</span>
                    ) : null}
                    {acc.accountOfficerName && acc.accountOfficerPhone ? ' · ' : null}
                    {acc.accountOfficerPhone ? (
                      <span className="tabular-nums">{acc.accountOfficerPhone}</span>
                    ) : null}
                  </p>
                ) : null}
                <p className="text-ui-xs text-teal-700/80 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  View statement
                </p>
              </button>
              {(canManageTreasury && canMutate) || canExecTreasuryDelete ? (
                <div className="flex items-center justify-end gap-2 px-3 pb-3 pt-0 border-t border-gray-100/80">
                  {canManageTreasury && canMutate ? (
                    <button
                      type="button"
                      onClick={() => onEditAccount?.(acc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
                    >
                      <Pencil size={12} /> Edit
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
          ))
        )}
      </div>
    </section>
  );
}
