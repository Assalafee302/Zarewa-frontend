import React from 'react';
import { formatNgn } from '../../lib/hrFormat';
import { ProfileStatusChip } from '../profile/profileDesign';

/**
 * Eligibility and quotation context for MD / HR purchase credit decisions.
 * @param {{ item?: object; data?: object; className?: string }} props
 */
export function HrPurchaseCreditDecisionContext({ item = null, data = null, className = '' }) {
  const src = data || item || {};
  const serviceYears = Number(src.serviceYears);
  const activeOutstanding = Number(src.activeOutstandingNgn) || 0;
  const quoteBalance = src.quoteBalanceNgn != null ? Number(src.quoteBalanceNgn) : null;
  const depositRequired = Number(src.depositRequiredNgn) || 0;
  const depositPct = Number(src.depositPct) || 0;
  const maxSingle = Number(src.maxSinglePurchaseNgn) || Number(src.eligibility?.policy?.maxSinglePurchaseNgn) || 0;
  const purposeNote = String(src.purposeNote || src.note || '').trim();
  const issues = src.eligibilityIssues || src.eligibility?.issues || [];

  const hasContext =
    Number.isFinite(serviceYears) ||
    activeOutstanding > 0 ||
    quoteBalance != null ||
    depositRequired > 0 ||
    maxSingle > 0 ||
    purposeNote ||
    issues.length;

  if (!hasContext) return null;

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-700 space-y-2 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Decision context</p>
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {Number.isFinite(serviceYears) ? (
          <>
            <dt className="text-slate-500">Service</dt>
            <dd className="font-semibold tabular-nums">~{serviceYears.toFixed(1)} years</dd>
          </>
        ) : null}
        {activeOutstanding > 0 ? (
          <>
            <dt className="text-slate-500">Other purchase credit</dt>
            <dd className="font-semibold tabular-nums">{formatNgn(activeOutstanding)} outstanding</dd>
          </>
        ) : null}
        {quoteBalance != null && quoteBalance > 0 ? (
          <>
            <dt className="text-slate-500">Quote balance due</dt>
            <dd className="font-semibold tabular-nums">{formatNgn(quoteBalance)}</dd>
          </>
        ) : null}
        {depositRequired > 0 ? (
          <>
            <dt className="text-slate-500">Deposit required</dt>
            <dd className="font-semibold tabular-nums">
              {depositPct}% ({formatNgn(depositRequired)}) before credit
            </dd>
          </>
        ) : null}
        {maxSingle > 0 ? (
          <>
            <dt className="text-slate-500">Policy max (single)</dt>
            <dd className="font-semibold tabular-nums">{formatNgn(maxSingle)}</dd>
          </>
        ) : null}
      </dl>
      {purposeNote ? (
        <p className="text-slate-600">
          <span className="font-semibold text-slate-800">Purpose: </span>
          {purposeNote}
        </p>
      ) : null}
      {issues.length ? (
        <ul className="space-y-0.5 text-amber-950">
          {issues.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      ) : (
        <ProfileStatusChip variant="approved">Eligible per policy</ProfileStatusChip>
      )}
    </div>
  );
}
