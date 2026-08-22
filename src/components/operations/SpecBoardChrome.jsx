import React from 'react';

/** Quiet mill-docket filter chip — sentence case, teal only when selected. */
export function SpecBoardFilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-sm px-2 py-1 text-ui-xs font-medium transition ${
        active
          ? 'bg-zarewa-teal text-white'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

export function SpecBoardCount({ children, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <span className={`rounded-sm border px-2 py-1 text-ui-xs font-medium tabular-nums ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}

/** Rank of metres produced this period — a real sequence, so numbering is the data. */
export function SpecHeroRank({ rank }) {
  if (!rank) return null;
  return (
    <span className="z-stencil ml-1 text-[10px] text-slate-500" title={`Most produced this period, #${rank}`}>
      #{rank}
    </span>
  );
}
