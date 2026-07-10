import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Search, UserRound } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceDeskColoredQueueRow, FinanceDeskQueueActionButton } from './FinanceDeskColoredQueuePanel';

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
 * Staff loan / recovery desk queue — collapsed by default so names are not visible on shared screens.
 * @param {{ expanded?: boolean; onExpandedChange?: (open: boolean) => void }} props
 */
export function StaffPaymentsCashierPanel({
  recoveries = [],
  obligations = [],
  onReceiveRecovery,
  onReceiveObligation,
  expanded: expandedProp,
  onExpandedChange,
}) {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = (next) => {
    const value = typeof next === 'function' ? next(expanded) : next;
    onExpandedChange?.(value);
    if (expandedProp === undefined) setExpandedInternal(value);
  };

  const [query, setQuery] = useState('');

  const allRows = useMemo(() => normalizeRows(recoveries, obligations), [recoveries, obligations]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => searchText(r.row).includes(q));
  }, [allRows, query]);

  const totalDue = useMemo(() => allRows.reduce((s, r) => s + r.amountNgn, 0), [allRows]);

  if (allRows.length === 0) return null;

  return (
    <div
      id="desk-queue-staff-payments"
      className="scroll-mt-20 rounded-xl border border-violet-200/80 bg-violet-50/35 shadow-sm"
      data-testid="finance-staff-payments-awaiting"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left hover:bg-violet-50/60 rounded-xl transition-colors"
        aria-expanded={expanded}
        data-testid="finance-staff-payments-toggle"
      >
        <Lock size={14} className="shrink-0 text-violet-800" aria-hidden />
        <span className="text-ui-xs font-black uppercase tracking-wide text-violet-950 flex items-center gap-1.5">
          <UserRound size={14} strokeWidth={2} aria-hidden />
          Staff payments
        </span>
        <span className="text-ui-xs font-bold tabular-nums text-violet-900">
          {allRows.length} due · {formatNgn(totalDue)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wide text-violet-800/90">
          {expanded ? (
            <>
              Hide list <ChevronUp size={14} aria-hidden />
            </>
          ) : (
            <>
              Show list <ChevronDown size={14} aria-hidden />
            </>
          )}
        </span>
      </button>

      {!expanded ? (
        <p className="px-3 pb-2.5 text-ui-xs leading-relaxed text-violet-950/75 border-t border-violet-100/80">
          Private — employee names stay hidden until you expand. Search by ID or name when the staff member is at
          your desk.
        </p>
      ) : (
        <div className="border-t border-violet-100/80 px-3 pb-3 pt-2 space-y-2">
          <p className="text-ui-xs leading-relaxed text-violet-950/80">
            Loans, purchase credit, and HR recoveries — confirm balance, then record cash or transfer to till/bank.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={14}
              />
              <input
                type="search"
                className="w-full rounded-lg border border-violet-200/80 bg-white py-1.5 pl-7 pr-2 text-ui-xs font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                placeholder="Search name, employee ID, case, quote…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search staff payments due"
              />
            </div>
            <span className="text-ui-xs font-bold tabular-nums text-violet-950">
              {formatNgn(totalDue)} due · {rows.length} shown
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-ui-xs text-slate-500 py-2 text-center">No matches — try another search.</p>
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
                      <span className="ml-1 text-ui-xs font-bold uppercase text-violet-800">{item.badge}</span>
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
        </div>
      )}
    </div>
  );
}
