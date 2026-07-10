import React from 'react';

const TONES = {
  default: 'border-slate-200 bg-white text-slate-900',
  teal: 'border-teal-200 bg-teal-50/40 text-teal-950',
  amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
  rose: 'border-rose-200 bg-rose-50/60 text-rose-950',
  indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-950',
};

/**
 * @param {{ label: string; value: React.ReactNode; hint?: string; tone?: keyof typeof TONES; icon?: React.ReactNode; compact?: boolean }} props
 */
export function FinanceKpiCard({ label, value, hint, tone = 'default', icon, compact = false }) {
  return (
    <div
      className={`border shadow-sm ${compact ? 'rounded-xl p-2.5' : 'rounded-2xl p-4'} ${TONES[tone] || TONES.default}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-bold uppercase tracking-wide text-slate-500 ${compact ? 'text-ui-xs' : 'text-ui-xs'}`}>
          {label}
        </p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className={`mt-0.5 font-black tabular-nums ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      {hint ? (
        <p className={`mt-0.5 font-medium opacity-80 ${compact ? 'text-ui-xs leading-snug' : 'text-xs'}`}>{hint}</p>
      ) : null}
    </div>
  );
}
