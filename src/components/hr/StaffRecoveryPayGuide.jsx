import React from 'react';
import { Building2, FileText, Wallet } from 'lucide-react';
import { formatNgn } from '../../lib/hrFormat';
import { obligationStatementPdfUrl } from '../../lib/hrStaffObligations';

/**
 * Employee-facing guide — how to pay discipline recovery at branch cashier.
 */
export function StaffRecoveryPayGuide({ recoveries = [], staffEmployeeNo, staffBranchId }) {
  const active = (Array.isArray(recoveries) ? recoveries : []).filter(
    (r) => Math.max(0, Number(r.principalOutstandingNgn) || 0) > 0
  );
  if (!active.length) return null;

  const totalDue = active.reduce((s, r) => s + (r.principalOutstandingNgn || 0), 0);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-teal-50/40 shadow-sm">
      <div className="border-b border-violet-100/80 bg-violet-900 px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Pay at branch cashier</p>
        <p className="mt-1 text-2xl font-black tabular-nums">{formatNgn(totalDue)}</p>
        <p className="text-xs text-violet-100 mt-0.5">Total outstanding — you can pay this in full today</p>
      </div>

      <div className="p-4 space-y-4">
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-900">
              1
            </span>
            <span>
              <strong className="text-slate-900">Bring your salary recovery letter</strong> from HR (if you have it).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-900">
              2
            </span>
            <span className="flex items-start gap-2">
              <Building2 size={16} className="mt-0.5 shrink-0 text-violet-700" aria-hidden />
              <span>
                Go to the <strong className="text-slate-900">branch cashier</strong>
                {staffBranchId ? ` (${staffBranchId} office)` : ''} and say you are paying a{' '}
                <strong>staff discipline recovery</strong>.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-900">
              3
            </span>
            <span className="flex items-start gap-2">
              <Wallet size={16} className="mt-0.5 shrink-0 text-violet-700" aria-hidden />
              <span>
                Tell the cashier your <strong className="text-slate-900">full name</strong>
                {staffEmployeeNo ? (
                  <>
                    {' '}
                    and employee ID <strong className="font-mono">{staffEmployeeNo}</strong>
                  </>
                ) : null}
                . They will show the amount to pay.
              </span>
            </span>
          </li>
        </ol>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your recovery account(s)</p>
          {active.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.title || 'Recovery'}</p>
                {r.caseNumber ? (
                  <p className="text-xs text-slate-500">Case {r.caseNumber}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums text-[#134e4a]">{formatNgn(r.principalOutstandingNgn)}</p>
                <a
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#134e4a] underline"
                  href={obligationStatementPdfUrl(r.id)}
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

        <p className="text-xs text-slate-500">
          After the cashier posts your payment, refresh this page — your balance drops and you can download an official
          receipt PDF.
        </p>
      </div>
    </div>
  );
}
