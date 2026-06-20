import React, { useMemo, useState } from 'react';
import { Search, UserRound, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceSectionCard } from './FinanceSectionCard';
import { FinanceEmptyState } from './FinanceEmptyState';
import { FinanceActionButton } from './FinanceActionButton';

function obligationSearchText(row) {
  return [
    row.staffDisplayName,
    row.staffEmployeeNo,
    row.staffUsername,
    row.title,
    row.kindLabel,
    row.quotationRef,
    row.branchId,
    row.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Cashier work queue — staff loans and purchase credit early repayments at the branch desk.
 */
export function StaffObligationRepaymentCashierPanel({ obligations = [], onReceive }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const list = (Array.isArray(obligations) ? obligations : []).filter(
      (o) => Math.max(0, Number(o.principalOutstandingNgn) || 0) > 0
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => obligationSearchText(o).includes(q));
  }, [obligations, query]);

  const totalDue = useMemo(
    () => rows.reduce((s, o) => s + Math.max(0, Number(o.principalOutstandingNgn) || 0), 0),
    [rows]
  );

  return (
    <FinanceSectionCard
      title="Staff loans & purchase credit — record payment received"
      icon={<UserRound size={16} className="text-teal-700" />}
      className="border-teal-200/80 ring-1 ring-teal-100/60"
    >
      <p className="mb-4 text-sm text-slate-600 leading-relaxed">
        Staff normally repay via <strong>payroll deduction</strong>. When someone pays early at your desk (cash or
        transfer), search their name or employee ID, confirm the outstanding balance, then record what was received.
        Their balance updates on <strong>My Profile → Loans & credit → Pay back</strong>.
      </p>

      {obligations.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
          <div className="flex items-center gap-2 text-teal-900">
            <Wallet size={18} aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide">Total outstanding</span>
          </div>
          <p className="text-xl font-black tabular-nums text-teal-950">{formatNgn(totalDue)}</p>
          <span className="text-xs text-teal-800/80">
            {rows.length} account{rows.length !== 1 ? 's' : ''}
            {query.trim() ? ' matching search' : ''}
          </span>
        </div>
      ) : null}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        <input
          type="search"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          placeholder="Search name, employee ID, quote ref…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search staff loan and purchase credit accounts"
        />
      </div>

      {obligations.length === 0 ? (
        <FinanceEmptyState title="No staff loans or purchase credit awaiting desk payment at this branch" />
      ) : rows.length === 0 ? (
        <FinanceEmptyState title="No matches — try another name or employee ID" />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const outstanding = Math.max(0, Number(row.principalOutstandingNgn) || 0);
            const monthly = Math.max(0, Number(row.installmentNgn) || 0);
            const lookup = [row.staffEmployeeNo, row.quotationRef].filter(Boolean).join(' · ');
            return (
              <li
                key={row.id}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-base font-bold text-slate-900">{row.staffDisplayName || row.userId}</p>
                    {lookup ? (
                      <p className="text-xs font-semibold text-teal-800">Lookup: {lookup}</p>
                    ) : null}
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                      <p className="font-bold uppercase tracking-wide text-[10px] text-teal-800">
                        {row.kindLabel || 'Staff obligation'}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">{row.title || row.id}</p>
                      <p className="mt-0.5">
                        {monthly > 0 ? `${formatNgn(monthly)}/mo via payroll` : 'Payroll deduction active'}
                        {row.branchId ? ` · Branch ${row.branchId}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:pt-1">
                    <div className="text-right sm:min-w-[7rem]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding</p>
                      <p className="text-2xl font-black tabular-nums text-[#134e4a]">{formatNgn(outstanding)}</p>
                    </div>
                    {onReceive ? (
                      <FinanceActionButton variant="primary" onClick={() => onReceive(row)}>
                        Record payment
                      </FinanceActionButton>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FinanceSectionCard>
  );
}
