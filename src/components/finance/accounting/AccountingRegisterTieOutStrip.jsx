import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../../Data/mockData';
import { tieOutSubsetSummary } from '../../../lib/accountingRegisterTieOut';

/**
 * @param {{
 *   checks: object[];
 *   loading?: boolean;
 *   onFocusTab?: (tabId: string) => void;
 *   thresholdPct?: number | null;
 * }} props
 */
export function AccountingRegisterTieOutStrip({ checks, loading = false, onFocusTab, thresholdPct }) {
  const summary = tieOutSubsetSummary(checks);
  const tolLabel =
    thresholdPct != null && Number.isFinite(Number(thresholdPct))
      ? `${Math.round(Number(thresholdPct) * 100)}%`
      : '1%';

  if (loading && !checks.length) {
    return (
      <p className="text-ui-xs font-medium text-slate-500">Loading register ↔ GL tie-out…</p>
    );
  }

  if (!checks.length) return null;

  return (
    <section className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {summary.ok ? (
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
          )}
          <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-700">
            Register ↔ GL · {summary.label}
          </p>
        </div>
        {onFocusTab ? (
          <button
            type="button"
            onClick={() => onFocusTab('close')}
            className="text-ui-xs font-bold text-teal-800 hover:underline"
          >
            Month-end tie-out →
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {checks.map((c) => {
          const ok = c.status === 'ok';
          return (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${
                ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
              title={`Register ${formatNgn(c.registerNgn)} · GL ${formatNgn(c.glNgn)} · Δ ${formatNgn(c.varianceNgn)}`}
            >
              <span className="font-mono normal-case">{c.glAccountCode}</span>
              {ok ? 'OK' : `Review ${c.variancePct != null ? `${c.variancePct}%` : ''}`}
            </span>
          );
        })}
      </div>
      {!summary.ok ? (
        <p className="text-ui-xs text-slate-500">
          Tolerance {tolLabel} or ₦50k floor — resolve variances before period lock.
        </p>
      ) : null}
    </section>
  );
}
