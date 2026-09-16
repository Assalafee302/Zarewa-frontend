/**
 * Cashier payout View / Release refund — what already happened to the balance, and how to fix it.
 */
import React, { useMemo } from 'react';
import { buildRefundPayoutSituationBrief } from '../../lib/refundCashierDetail.js';

const TONE = {
  amber: {
    box: 'border-amber-300 bg-amber-50 text-amber-950',
    head: 'text-amber-950',
    sub: 'text-amber-900/90',
    step: 'border-amber-200 bg-white/70 text-amber-950',
  },
  sky: {
    box: 'border-sky-300 bg-sky-50 text-sky-950',
    head: 'text-sky-950',
    sub: 'text-sky-900/90',
    step: 'border-sky-200 bg-white/70 text-sky-950',
  },
  slate: {
    box: 'border-slate-300 bg-slate-50 text-slate-900',
    head: 'text-slate-900',
    sub: 'text-slate-700',
    step: 'border-slate-200 bg-white/80 text-slate-800',
  },
};

export function RefundPayoutSituationPanel({ refund, className = '' }) {
  const brief = useMemo(() => buildRefundPayoutSituationBrief(refund), [refund]);
  if (!brief?.whatHappened?.length && !brief?.howToResolve?.length) return null;

  const tone = TONE[brief.tone] || TONE.amber;

  return (
    <div
      className={`rounded-xl border px-3 py-3 space-y-2.5 ${tone.box} ${className}`.trim()}
      role="region"
      aria-label="Refund payout situation"
    >
      <div>
        <p className="text-ui-xs font-bold uppercase tracking-wide opacity-80">What happened</p>
        <p className={`mt-0.5 text-sm font-black leading-snug ${tone.head}`}>{brief.headline}</p>
      </div>
      {brief.whatHappened.length > 0 ? (
        <ul className={`space-y-1 text-xs leading-relaxed ${tone.sub}`}>
          {brief.whatHappened.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {brief.howToResolve.length > 0 ? (
        <div className={`rounded-lg border px-2.5 py-2 space-y-1.5 ${tone.step}`}>
          <p className="text-ui-xs font-bold uppercase tracking-wide">How to resolve</p>
          <ol className="list-decimal pl-4 space-y-1 text-xs leading-relaxed font-medium">
            {brief.howToResolve.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
