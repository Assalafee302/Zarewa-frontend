import React, { useMemo, useState } from 'react';
import { Search, UserRound, Wallet, ClipboardCheck } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceSectionCard } from './FinanceSectionCard';
import { FinanceEmptyState } from './FinanceEmptyState';
import { FinanceActionButton } from './FinanceActionButton';

function recoverySearchText(row) {
  return [
    row.staffDisplayName,
    row.staffEmployeeNo,
    row.staffUsername,
    row.caseNumber,
    row.scheduleId,
    row.title,
    row.branchId,
    row.initiatedByName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Cashier work queue — HR-initiated staff recoveries; cashier records payment received.
 */
export function StaffRecoveryCashierPanel({ recoveries = [], onReceive }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const list = (Array.isArray(recoveries) ? recoveries : []).filter(
      (r) => Math.max(0, Number(r.principalOutstandingNgn) || 0) > 0
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => recoverySearchText(r).includes(q));
  }, [recoveries, query]);

  const totalDue = useMemo(
    () => rows.reduce((s, r) => s + Math.max(0, Number(r.principalOutstandingNgn) || 0), 0),
    [rows]
  );

  return (
    <FinanceSectionCard
      title="Staff recoveries — record payment received"
      icon={<UserRound size={16} className="text-violet-700" />}
      className="border-violet-200/80 ring-1 ring-violet-100/60"
    >
      <p className="mb-4 text-sm text-slate-600 leading-relaxed">
        HR has already set what each staff member owes. When they pay at your desk, search their name or employee ID,
        confirm the HR amount due, then record the <strong>payment date</strong> and which{' '}
        <strong>bank or cash account</strong> received the money.
      </p>

      {recoveries.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <div className="flex items-center gap-2 text-violet-900">
            <Wallet size={18} aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide">Total HR amount due</span>
          </div>
          <p className="text-xl font-black tabular-nums text-violet-950">{formatNgn(totalDue)}</p>
          <span className="text-xs text-violet-800/80">
            {rows.length} staff member{rows.length !== 1 ? 's' : ''}
            {query.trim() ? ' matching search' : ''}
          </span>
        </div>
      ) : null}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        <input
          type="search"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="Search name, employee ID, case number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search staff recoveries"
        />
      </div>

      {recoveries.length === 0 ? (
        <FinanceEmptyState title="No HR-initiated recoveries awaiting payment at this branch" />
      ) : rows.length === 0 ? (
        <FinanceEmptyState title="No matches — try another name or employee ID" />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const outstanding = Math.max(0, Number(row.principalOutstandingNgn) || 0);
            const hrAmount = Math.max(0, Number(row.hrInitiatedAmountNgn ?? row.totalAmountNgn) || 0);
            const lookup = [row.staffEmployeeNo, row.caseNumber].filter(Boolean).join(' · ');
            return (
              <li
                key={row.scheduleId}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-base font-bold text-slate-900">{row.staffDisplayName || row.userId}</p>
                    {lookup ? (
                      <p className="text-xs font-semibold text-violet-800">Cashier lookup: {lookup}</p>
                    ) : null}
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px] text-violet-800">
                        <ClipboardCheck size={12} aria-hidden />
                        HR initiated
                      </p>
                      <p className="mt-1">
                        Original recovery: <strong className="text-slate-900">{formatNgn(hrAmount)}</strong>
                        {row.initiatedByName ? ` · by ${row.initiatedByName}` : ''}
                        {row.initiatedAtIso ? ` · ${String(row.initiatedAtIso).slice(0, 10)}` : ''}
                      </p>
                      <p className="mt-0.5">
                        {row.caseNumber ? `Case ${row.caseNumber}` : row.title || 'Discipline recovery'}
                        {row.branchId ? ` · Branch ${row.branchId}` : ''}
                        {row.installmentAmountNgn
                          ? ` · or ${formatNgn(row.installmentAmountNgn)}/mo via payroll`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:pt-1">
                    <div className="text-right sm:min-w-[7rem]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount due now</p>
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
