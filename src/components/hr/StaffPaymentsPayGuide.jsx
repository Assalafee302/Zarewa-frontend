import React from 'react';
import { Building2, CalendarClock, FileText, Wallet } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { obligationStatementPdfUrl } from '../../lib/hrStaffObligations';
import {
  obligationPayrollDeductionMessage,
  obligationsWithPayrollDeduction,
  totalMonthlyPayrollDeduction,
  totalOutstandingNgn,
  normalizeObligationForPayback,
} from '../../lib/hrObligationPayUi';

function normalizeRecovery(row) {
  if (!row) return null;
  const outstanding = Math.max(0, Number(row.principalOutstandingNgn) || 0);
  if (outstanding <= 0) return null;
  return {
    id: row.id || row.scheduleId,
    kind: 'recovery',
    kindLabel: 'Recovery',
    title: row.title || (row.caseNumber ? `Case ${row.caseNumber}` : 'Discipline recovery'),
    outstandingNgn: outstanding,
    monthlyNgn: Math.max(0, Number(row.installmentAmountNgn) || 0),
    caseNumber: row.caseNumber,
    statementId: row.id,
  };
}

/**
 * Unified employee guide — loans, purchase credit, and discipline recovery at Finance desk.
 */
export function StaffPaymentsPayGuide({
  recoveries = [],
  obligations = [],
  staffEmployeeNo,
  staffBranchId,
}) {
  const recoveryRows = (Array.isArray(recoveries) ? recoveries : [])
    .map(normalizeRecovery)
    .filter(Boolean);
  const obligationRows = (Array.isArray(obligations) ? obligations : [])
    .map((o) => normalizeObligationForPayback(o, o.kind || 'loan'))
    .filter((o) => o && (o.outstandingNgn > 0 || o.status === 'pending_disbursement' || o.status === 'pending_approval'));

  const allRows = [...recoveryRows, ...obligationRows];
  if (!allRows.length) return null;

  const totalDue =
    recoveryRows.reduce((s, r) => s + r.outstandingNgn, 0) + totalOutstandingNgn(obligationRows);
  const monthlyTotal = totalMonthlyPayrollDeduction(obligationRows);
  const payrollLines = obligationsWithPayrollDeduction(obligationRows)
    .map((o) => obligationPayrollDeductionMessage(o))
    .filter(Boolean);
  const pausedLines = obligationRows.filter((o) => o.isPaused);

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-white to-teal-50/40 shadow-sm">
      {pausedLines.length ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-bold flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Payroll deduction paused on {pausedLines.length} account(s) — you can still pay early at Finance.
          </p>
        </div>
      ) : null}

      <div className="border-b border-violet-100/80 bg-zarewa-teal px-3 py-2.5 text-white">
        <p className="text-ui-xs font-bold uppercase tracking-widest text-teal-200/90">Pay at Finance desk</p>
        <p className="text-xl font-black tabular-nums">{formatNgn(totalDue)}</p>
        <p className="text-ui-xs text-teal-100/95 mt-0.5">
          {monthlyTotal > 0
            ? `${formatNgn(monthlyTotal)}/month via payroll on loans & credit · recoveries paid at cashier`
            : 'Loans/credit via payroll when active · recoveries at branch cashier'}
        </p>
      </div>

      <div className="p-3 space-y-3 text-xs text-slate-700">
        <ol className="space-y-2">
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-ui-xs font-black text-violet-900">
              1
            </span>
            <span>
              Go to <strong>Finance → My desk</strong>
              {staffBranchId ? ` (${staffBranchId})` : ''} — use <strong>your branch cashier</strong>, with your employee ID
              {staffEmployeeNo ? (
                <>
                  {' '}
                  <strong className="font-mono">{staffEmployeeNo}</strong>
                </>
              ) : null}
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-ui-xs font-black text-violet-900">
              2
            </span>
            <span className="flex items-start gap-1.5">
              <Wallet size={14} className="mt-0.5 shrink-0 text-violet-700" aria-hidden />
              <span>
                Say you are paying a <strong>staff loan, purchase credit, or HR recovery</strong> — cashier records
                cash or transfer to the correct till/bank.
              </span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-ui-xs font-black text-violet-900">
              3
            </span>
            <span>
              Refresh this page after payment — balance drops and you can download a receipt PDF.
            </span>
          </li>
        </ol>

        {payrollLines.length ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-emerald-900">Payroll (loans & credit)</p>
            <ul className="mt-1 space-y-0.5 text-ui-xs text-emerald-950">
              {payrollLines.slice(0, 4).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white/90 p-2.5 space-y-1.5">
          <p className="flex items-center gap-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
            <Building2 size={11} aria-hidden />
            Your account(s)
          </p>
          {allRows.map((o) => (
            <div
              key={`${o.kind}-${o.id}`}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{o.title}</p>
                <p className="text-ui-xs text-slate-500">
                  {o.kindLabel}
                  {o.monthlyNgn > 0 ? ` · ${formatNgn(o.monthlyNgn)}/mo payroll` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black tabular-nums text-zarewa-teal">{formatNgn(o.outstandingNgn)}</p>
                {o.statementId ? (
                  <a
                    className="inline-flex items-center gap-1 text-ui-xs font-semibold text-zarewa-teal underline"
                    href={obligationStatementPdfUrl(o.statementId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={10} aria-hidden />
                    Statement
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
