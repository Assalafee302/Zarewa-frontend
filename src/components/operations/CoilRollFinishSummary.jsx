import React from 'react';
import { formatSignedKg, rollFinishCheck } from '../../lib/coilExpectedLife';

function cell(label, value) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="text-ui-xs font-medium text-slate-500">{label}</p>
      <p className="text-base font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

export function CoilRollFinishSummary({ receivedKg, bookedKg, tailKg, metres, rate, onWatchList = false }) {
  const check = rollFinishCheck({ receivedKg, bookedKg, tailKg, metres, rate });
  const review = check.verdict === 'review';
  return (
    <div className="space-y-3" data-screen="roll-finish">
      {onWatchList ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
          This coil is on the watch list. Check the difference before you finish the roll.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cell('Received', fmt(check.receivedKg))}
        {cell('Total booked', fmt(check.bookedKg))}
        {cell('Tail entered', fmt(check.tailKg))}
        {cell('Expected', fmt(check.expectedKg))}
        {cell('Difference', formatSignedKg(check.difference))}
        <div
          className={`rounded-md border px-3 py-2 ${
            review ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <p className="text-ui-xs font-medium text-slate-500">Result</p>
          <p className={`text-base font-bold ${review ? 'text-amber-950' : 'text-emerald-800'}`}>
            {review ? 'Review' : 'Pass'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function rollFinishNeedsReason(props) {
  return rollFinishCheck(props).verdict === 'review';
}
