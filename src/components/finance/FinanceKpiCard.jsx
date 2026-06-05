import React from 'react';

const TONES = {
  default: 'border-slate-200 bg-white text-slate-900',
  teal: 'border-teal-200 bg-teal-50/40 text-teal-950',
  amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
  rose: 'border-rose-200 bg-rose-50/60 text-rose-950',
  indigo: 'border-indigo-200 bg-indigo-50/50 text-indigo-950',
};

/**
 * @param {{ label: string; value: React.ReactNode; hint?: string; tone?: keyof typeof TONES; icon?: React.ReactNode }} props
 */
export function FinanceKpiCard({ label, value, hint, tone = 'default', icon }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${TONES[tone] || TONES.default}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium opacity-80">{hint}</p> : null}
    </div>
  );
}
