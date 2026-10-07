import React from 'react';

const TONE = {
  OK: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  LOW: 'bg-amber-50 text-amber-900 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function CoilVarianceBadge({ status, varianceLabel }) {
  if (!status) {
    return <span className="text-ui-xs font-medium text-slate-400">—</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-ui-xs font-bold tabular-nums ${TONE[status] || TONE.OK}`}
    >
      <span>{status}</span>
      {varianceLabel ? <span className="font-semibold">{varianceLabel}</span> : null}
    </span>
  );
}
