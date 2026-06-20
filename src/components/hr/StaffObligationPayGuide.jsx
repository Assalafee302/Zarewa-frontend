import React from 'react';
import { Building2, CalendarClock, FileText, Wallet } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { obligationStatementPdfUrl } from '../../lib/hrStaffObligations';
import {
  obligationPayrollDeductionMessage,
  obligationsWithPayrollDeduction,
  totalMonthlyPayrollDeduction,
  totalOutstandingNgn,
} from '../../lib/hrObligationPayUi';

/**
 * Employee-facing guide — how staff loans and purchase credit are repaid.
 */
export function StaffObligationPayGuide({ obligations = [], staffEmployeeNo, staffBranchId }) {
  const active = (Array.isArray(obligations) ? obligations : []).filter(
    (o) => o.outstandingNgn > 0 || o.status === 'pending_disbursement' || o.status === 'pending_approval'
  );
  if (!active.length) return null;

  const totalDue = totalOutstandingNgn(active);
  const monthlyTotal = totalMonthlyPayrollDeduction(active);
  const payrollLines = obligationsWithPayrollDeduction(active)
    .map((o) => obligationPayrollDeductionMessage(o))
    .filter(Boolean);
  const pausedLines = active.filter((o) => o.isPaused);

  return (
    <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50/40 shadow-sm">
      {pausedLines.length ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            Repayment paused on payroll
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {pausedLines.map((o) => (
              <li key={o.id}>
                {o.title || o.kindLabel}
                {o.pauseUntilIso ? ` — resumes ${String(o.pauseUntilIso).slice(0, 10)}` : ' — until HR resumes'}
                {o.pauseReason ? `. ${o.pauseReason}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            You can still pay early at the Finance desk or ask HR to record a repayment.
          </p>
        </div>
      ) : null}
      <div className="border-b border-teal-100/80 bg-[#134e4a] px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200/90">How you pay back</p>
        <p className="mt-1 text-2xl font-black tabular-nums">{formatNgn(totalDue)}</p>
            <p className="text-xs text-teal-100/95 mt-0.5">
              {monthlyTotal > 0
                ? `${formatNgn(monthlyTotal)}/month comes out of your salary automatically`
                : pausedLines.length
                  ? 'Payroll deductions are paused — you can still pay early at Finance'
                  : 'Repayment is collected via payroll after approval'}
            </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-900">
              <CalendarClock size={14} aria-hidden />
              Default — payroll
            </p>
            <p className="mt-2 text-sm text-emerald-950">
              You <strong>do not pay manually each month</strong>. HR runs payroll and the installment is deducted from
              your net pay until the balance is cleared.
            </p>
            {payrollLines.length ? (
              <ul className="mt-2 space-y-1 text-xs text-emerald-900/90">
                {payrollLines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
              <Wallet size={14} aria-hidden />
              Pay early (optional)
            </p>
            <ol className="mt-2 space-y-2 text-xs text-slate-700">
              <li>
                Pay <strong>cash at the branch cashier</strong> (Finance → Desk) or <strong>bank transfer</strong>
                {staffBranchId ? ` (${staffBranchId})` : ''}.
              </li>
              <li>
                Bring your <strong>statement PDF</strong> and tell the cashier or HR you are settling a{' '}
                <strong>staff loan or purchase credit</strong>
                {staffEmployeeNo ? (
                  <>
                    {' '}
                    (ID <span className="font-mono font-semibold">{staffEmployeeNo}</span>)
                  </>
                ) : null}
                .
              </li>
              <li>
                Finance posts at <strong>Finance → Desk</strong> (cashier) or HR at{' '}
                <strong>HR → Loans → Record repayments</strong> — your balance updates the same day.
              </li>
              <li>
                <strong>Lump-sum pay</strong> clears balance faster; your monthly payroll amount stays the same unless
                HR adjusts your schedule.
              </li>
            </ol>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Building2 size={12} aria-hidden />
            Your account(s)
          </p>
          {active.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{o.title || o.kindLabel}</p>
                <p className="text-xs text-slate-500">
                  {o.kindLabel}
                  {o.monthlyNgn > 0 ? ` · ${formatNgn(o.monthlyNgn)}/mo payroll` : ''}
                  {o.quotationRef ? ` · ${o.quotationRef}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums text-[#134e4a]">{formatNgn(o.outstandingNgn)}</p>
                <a
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#134e4a] underline"
                  href={obligationStatementPdfUrl(o.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={12} aria-hidden />
                  Statement PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
