import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { FinanceActionButton } from './FinanceActionButton';

function CountCard({ label, count, tone = 'slate', hint }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
    rose: 'border-rose-200 bg-rose-50/80 text-rose-950',
    violet: 'border-violet-200 bg-violet-50/80 text-violet-950',
    slate: 'border-slate-200 bg-white text-slate-900',
  };
  const cls = tones[tone] || tones.slate;
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-black tabular-nums mt-1">
        {typeof count === 'number' && count > 999 ? count.toLocaleString() : Number(count) || 0}
      </p>
      {hint ? <p className="text-xs font-medium mt-1 opacity-90">{hint}</p> : null}
    </div>
  );
}

/**
 * @param {{
 *   data: object | null,
 *   loading?: boolean,
 *   error?: string,
 *   onReload?: () => void,
 * }} props
 */
export function Ap1cDryRunPanel({ data, loading, error, onReload }) {
  const s = data?.summary || {};
  const notes = data?.notes || [];
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#134e4a]">Receipt &amp; production readiness</p>
          <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed">
            Read-only checks before turning on Policy v1 GL posting. No journals have been changed.
          </p>
        </div>
        {onReload ? (
          <FinanceActionButton variant="primary" onClick={() => onReload()} disabled={loading}>
            <RefreshCw size={14} className={`mr-1 inline ${loading ? 'animate-spin' : ''}`} />
            Load report
          </FinanceActionButton>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm font-medium text-violet-800">Loading AP1c dry-run…</p>
      ) : null}

      {data?.status === 'dry_run_only' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CountCard
              label="Receipts that should be deposits"
              count={s.receiptsBeforeProductionCredited1200Count}
              tone="amber"
              hint={s.expected2500InsteadOf1200Ngn ? formatNgn(s.expected2500InsteadOf1200Ngn) : undefined}
            />
            <CountCard label="Possible AR overstatement" count={formatNgn(s.potentialArOverstatementNgn)} tone="rose" />
            <CountCard
              label="Possible deposit understatement"
              count={formatNgn(s.potentialDepositUnderstatementNgn)}
              tone="amber"
            />
            <CountCard label="Paid quotes, production not done" count={s.quotationsPaidButNoProductionCount} tone="amber" />
            <CountCard label="Legacy receipt risk" count={s.mixedLegacyAndPolicyReceiptCount} tone="amber" />
            <CountCard label="Reversal / refund review items" count={(s.receiptReversalsMissingResolvableMetaCount || 0) + (s.refundPayoutsRevenueReviewCount || 0)} tone="rose" />
          </div>
          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-800"
          >
            <ChevronDown size={14} className={showTechnical ? 'rotate-180' : ''} />
            {showTechnical ? 'Hide' : 'Show'} technical details
          </button>
          {showTechnical ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
              <CountCard label="Release gap (₦)" count={s.releaseGapNgn} tone="violet" />
              <CountCard label="Production duplicate AR risk" count={s.productionDuplicateRiskCount} tone="rose" />
              <CountCard label="Reversals missing account" count={s.receiptReversalsMissingResolvableMetaCount} tone="rose" />
              <CountCard label="Refunds — revenue review" count={s.refundPayoutsRevenueReviewCount} tone="amber" />
              <CountCard label="Deposit refunds (pre-prod)" count={s.depositRefundsBeforeProductionCount} tone="slate" />
              <CountCard label="Mixed legacy/AP1c refund risk" count={s.mixedLegacyAp1cRefundRiskCount} tone="amber" />
            </div>
          ) : null}
          {notes.length ? (
            <ul className="text-xs font-medium text-violet-900/90 list-disc pl-4 space-y-1">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
