import React, { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from './FinanceDeskColoredQueuePanel';

function searchText(row) {
  return [
    row.staffDisplayName,
    row.staffEmployeeNo,
    row.staffUsername,
    row.caseNumber,
    row.scheduleId,
    row.title,
    row.kindLabel,
    row.quotationRef,
    row.branchId,
    row.id,
    row.initiatedByName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeRows(recoveries = [], obligations = []) {
  const recoveryRows = (Array.isArray(recoveries) ? recoveries : [])
    .filter((r) => Math.max(0, Number(r.principalOutstandingNgn) || 0) > 0)
    .map((row) => ({
      key: `recovery:${row.scheduleId}`,
      payKind: 'recovery',
      badge: 'Recovery',
      staffName: row.staffDisplayName || row.userId,
      meta: [row.staffEmployeeNo, row.caseNumber].filter(Boolean).join(' · '),
      detail: row.caseNumber
        ? `Case ${row.caseNumber}${row.branchId ? ` · ${row.branchId}` : ''}`
        : [row.title || 'Discipline recovery', row.branchId].filter(Boolean).join(' · '),
      amountNgn: Math.max(0, Number(row.principalOutstandingNgn) || 0),
      row,
    }));

  const obligationRows = (Array.isArray(obligations) ? obligations : [])
    .filter((o) => Math.max(0, Number(o.principalOutstandingNgn) || 0) > 0)
    .map((row) => {
      const monthly = Math.max(0, Number(row.installmentNgn) || 0);
      return {
        key: `obligation:${row.id}`,
        payKind: 'obligation',
        badge: row.kindLabel || 'Loan/credit',
        staffName: row.staffDisplayName || row.userId,
        meta: [row.staffEmployeeNo, row.quotationRef].filter(Boolean).join(' · '),
        detail: [row.title || row.id, monthly > 0 ? `${formatNgn(monthly)}/mo payroll` : null, row.branchId]
          .filter(Boolean)
          .join(' · '),
        amountNgn: Math.max(0, Number(row.principalOutstandingNgn) || 0),
        row,
      };
    });

  return [...recoveryRows, ...obligationRows].sort((a, b) =>
    String(a.staffName || '').localeCompare(String(b.staffName || ''), undefined, { sensitivity: 'base' })
  );
}

/**
 * Unified cashier queue — staff recoveries, loans, and purchase credit in one compact panel.
 */
export function StaffPaymentsCashierPanel({
  recoveries = [],
  obligations = [],
  onReceiveRecovery,
  onReceiveObligation,
}) {
  const [query, setQuery] = useState('');

  const allRows = useMemo(() => normalizeRows(recoveries, obligations), [recoveries, obligations]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => searchText(r.row).includes(q));
  }, [allRows, query]);

  const totalDue = useMemo(() => rows.reduce((s, r) => s + r.amountNgn, 0), [rows]);

  if (allRows.length === 0) return null;

  return (
    <FinanceDeskColoredQueuePanel
      sectionId="desk-queue-staff-payments"
      theme="violet"
      title="Staff payments — loans, credit & recoveries"
      icon={<UserRound size={16} strokeWidth={2} />}
      count={allRows.length}
      description="One desk flow: search employee ID or name, confirm HR balance, record cash or transfer to the correct till/bank. Payroll still deducts monthly unless they pay early here."
      testId="finance-staff-payments-awaiting"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <div className="relative flex-1 min-w-[12rem]">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={14}
          />
          <input
            type="search"
            className="w-full rounded-lg border border-violet-200/80 bg-white py-1.5 pl-7 pr-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
            placeholder="Search name, employee ID, case, quote…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search staff payments due"
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums text-violet-950">
          {formatNgn(totalDue)} due · {rows.length} shown
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[10px] text-slate-500 py-2 text-center">No matches — try another search.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((item) => (
            <FinanceDeskColoredQueueRow
              key={item.key}
              theme="violet"
              testId={`finance-staff-payment-row-${item.key}`}
              title={
                <>
                  <span>{item.staffName}</span>
                  <span className="ml-1 text-[8px] font-bold uppercase text-violet-800">{item.badge}</span>
                </>
              }
              meta={[item.meta, item.detail].filter(Boolean).join(' · ')}
              amount={formatNgn(item.amountNgn)}
              actions={
                <FinanceDeskQueueActionButton
                  tone="primary"
                  onClick={() =>
                    item.payKind === 'recovery'
                      ? onReceiveRecovery?.(item.row)
                      : onReceiveObligation?.(item.row)
                  }
                  title="Record payment received at desk"
                >
                  Record pay
                </FinanceDeskQueueActionButton>
              }
            />
          ))}
        </ul>
      )}
    </FinanceDeskColoredQueuePanel>
  );
}
