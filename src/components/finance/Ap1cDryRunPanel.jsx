import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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

  return (
    <section className="rounded-2xl border border-violet-300 bg-violet-50/40 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-900">
            AP1c GL dry-run (Policy v1)
          </p>
          <p className="text-sm font-medium text-violet-950 mt-1 leading-relaxed">
            Dry-run only — no GL has changed. Review before enabling receipt/production posting flags.
          </p>
        </div>
        {onReload ? (
          <button
            type="button"
            onClick={() => onReload()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
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
              label="Receipts pre-prod → GL 1200 (should be 2500)"
              count={s.receiptsBeforeProductionCredited1200Count}
              tone="amber"
              hint={
                s.expected2500InsteadOf1200Ngn
                  ? `₦${Number(s.expected2500InsteadOf1200Ngn).toLocaleString()} mis-posted`
                  : undefined
              }
            />
            <CountCard
              label="Expected deposit (2500) amount"
              count={s.expected2500InsteadOf1200Ngn}
              tone="violet"
            />
            <CountCard label="Paid, no production yet" count={s.quotationsPaidButNoProductionCount} tone="amber" />
            <CountCard label="Release gap (2500 vs advance-only)" count={s.releaseGapNgn} tone="rose" />
            <CountCard label="Potential AR overstatement" count={s.potentialArOverstatementNgn} tone="rose" />
            <CountCard
              label="Potential deposit understatement"
              count={s.potentialDepositUnderstatementNgn}
              tone="amber"
            />
            <CountCard label="Mixed legacy / policy receipts" count={s.mixedLegacyAndPolicyReceiptCount} tone="amber" />
            <CountCard label="Production duplicate AR risk" count={s.productionDuplicateRiskCount} tone="rose" />
          </div>
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
