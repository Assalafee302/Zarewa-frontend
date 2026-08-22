import React from 'react';
import { Link } from 'react-router-dom';

const TONES = {
  default: 'text-slate-900',
  teal: 'text-slate-900',
  amber: 'text-amber-950',
  emerald: 'text-slate-900',
  red: 'text-rose-950',
};

/**
 * Personnel-file count — ink figures, not teal dashboard tiles.
 */
export function HrKpiCard({ label, value, hint, tone = 'default', to, onClick }) {
  const valueCls = TONES[tone] || TONES.default;
  const cls = `rounded-md border border-slate-200 bg-white px-4 py-3 block ${
    to || onClick ? 'hover:bg-slate-50 cursor-pointer' : ''
  }`;
  const inner = (
    <>
      <p className="text-ui-xs font-medium text-slate-500">{label}</p>
      <p className={`z-stencil mt-1.5 text-2xl ${valueCls}`}>{value}</p>
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
