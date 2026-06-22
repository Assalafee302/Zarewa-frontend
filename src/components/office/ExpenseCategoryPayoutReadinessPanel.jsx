import React from 'react';
import { CheckCircle2, CircleDollarSign, XCircle } from 'lucide-react';
import { ExpenseCategoryLaneBadge } from './ExpenseCategoryLaneBadge.jsx';

/**
 * GL preview + payout gate checklist for Finance pay modal.
 */
export function ExpenseCategoryPayoutReadinessPanel({ glPreview, payoutGate }) {
  if (!glPreview?.gl && !payoutGate?.checks?.length) return null;

  const ready = payoutGate?.ok !== false;

  return (
    <div className="mb-6 space-y-3">
      {glPreview?.gl ? (
        <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50/90 to-white px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-teal-900/75 flex items-center gap-1">
                <CircleDollarSign size={12} aria-hidden />
                GL on payout
              </p>
              <p className="mt-1.5 text-sm font-bold text-teal-950 tabular-nums">
                Dr {glPreview.gl.debitAccountCode}
                <span className="font-medium text-teal-800/90"> · Cr Treasury cash</span>
              </p>
            </div>
            {glPreview.expenseCategory ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ExpenseCategoryLaneBadge
                  category={glPreview.expenseCategory}
                  laneKey={glPreview.categoryLane}
                />
                <span className="text-[10px] font-semibold text-slate-700">{glPreview.expenseCategory}</span>
              </div>
            ) : null}
          </div>
          {glPreview.gl.isCapex ? (
            <p className="text-[10px] text-teal-800 mt-2">
              Capex — fixed asset register updates when this request is fully paid.
            </p>
          ) : null}
        </div>
      ) : null}

      {Array.isArray(payoutGate?.checks) && payoutGate.checks.length > 0 ? (
        <div
          className={`rounded-xl border px-4 py-3 ${
            ready
              ? 'border-emerald-200/90 bg-emerald-50/75'
              : 'border-amber-300/90 bg-amber-50/90 shadow-sm shadow-amber-100/50'
          }`}
        >
          <p
            className={`text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5 ${
              ready ? 'text-emerald-900' : 'text-amber-950'
            }`}
          >
            {ready ? (
              <CheckCircle2 size={13} className="text-emerald-600" aria-hidden />
            ) : (
              <XCircle size={13} className="text-amber-700" aria-hidden />
            )}
            Payout readiness — {ready ? 'ready to post' : 'complete items below'}
          </p>
          {!ready && payoutGate.error ? (
            <p className="text-[11px] font-semibold text-amber-950 mt-2 leading-snug">{payoutGate.error}</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {payoutGate.checks.map((check) => (
              <li
                key={check.key}
                className={`flex gap-2.5 rounded-lg px-2 py-1.5 text-[11px] ${
                  check.ok ? 'bg-white/50' : 'bg-white/80 ring-1 ring-amber-200/80'
                }`}
              >
                {check.ok ? (
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                ) : (
                  <XCircle size={14} className="text-amber-700 shrink-0 mt-0.5" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900">{check.label}</span>
                  {check.detail ? (
                    <span className="block text-[10px] text-slate-600 mt-0.5 leading-snug">{check.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
