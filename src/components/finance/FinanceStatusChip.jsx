import React from 'react';

const STYLES = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  trial: 'border-sky-200 bg-sky-50 text-sky-900',
  credit: 'border-teal-200 bg-teal-50 text-teal-900',
};

export function FinanceStatusChip({ label, tone = 'neutral' }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${
        STYLES[tone] || STYLES.neutral
      }`}
    >
      {label}
    </span>
  );
}
