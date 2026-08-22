import React from 'react';

/**
 * Gauge stamp — mill-ticket mark, not a pill.
 */
export function GaugeStamp({ gauge, className = '' }) {
  const label = String(gauge || '').trim();
  if (!label) return null;
  return (
    <span
      className={`z-stencil inline-flex items-center rounded-sm border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] leading-none text-slate-800 ${className}`}
      title={`Gauge ${label}`}
    >
      {label}
    </span>
  );
}

/** Colour name + gauge as one spec mark (no colour square). */
export function MillSpecMark({ colour, gauge, className = '' }) {
  const colourLabel = String(colour || '').trim();
  const gaugeLabel = String(gauge || '').trim();
  if (!colourLabel && !gaugeLabel) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      {colourLabel ? <span className="truncate text-xs text-slate-600">{colourLabel}</span> : null}
      {gaugeLabel ? <GaugeStamp gauge={gaugeLabel} /> : null}
    </span>
  );
}

