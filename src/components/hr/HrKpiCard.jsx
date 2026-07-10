import React from 'react';
import { Link } from 'react-router-dom';

const TONES = {
  default: 'border-slate-100 bg-white text-slate-900',
  teal: 'border-teal-100 bg-teal-50/40 text-teal-950',
  amber: 'border-amber-100 bg-amber-50/50 text-amber-950',
  emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-950',
  red: 'border-red-100 bg-red-50/40 text-red-950',
};

/** HR KPI card aligned with Finance module styling. */
export function HrKpiCard({ label, value, hint, tone = 'default', to, onClick }) {
  const cls = `rounded-2xl border px-4 py-4 shadow-sm block transition-colors ${TONES[tone] || TONES.default} ${to || onClick ? 'hover:border-zarewa-teal/30 cursor-pointer' : ''}`;
  const inner = (
    <>
      <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={`${cls} w-full text-left`} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export default HrKpiCard;
