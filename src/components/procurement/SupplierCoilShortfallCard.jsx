import React from 'react';
import { Scale } from 'lucide-react';

function formatKg(n) {
  const v = Math.round((Number(n) || 0) * 10) / 10;
  return `${v.toLocaleString()} kg`;
}

/**
 * Weighbridge kg vs purchased kg for a supplier. Short landings stay visible here
 * after the PO line is closed so they do not hang as open commitment.
 */
export function SupplierCoilShortfallCard({ variance }) {
  if (!variance || !(variance.orderedKg > 0)) return null;
  const hasShort = variance.shortKg > 0.5;
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        hasShort ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200/90 bg-slate-50/40'
      }`}
    >
      <p className="text-ui-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-500">
        <Scale size={12} /> Coil receipt
      </p>
      <p className={`text-lg font-black tabular-nums ${hasShort ? 'text-amber-900' : 'text-zarewa-teal'}`}>
        {hasShort ? `${formatKg(variance.shortKg)} short` : 'On weight'}
      </p>
      <p className="text-ui-xs text-slate-600 mt-1 leading-snug">
        {formatKg(variance.landedKg)} received / {formatKg(variance.orderedKg)} purchased
        {hasShort ? ` · ${variance.shortPoCount} PO(s)` : ''}
      </p>
    </div>
  );
}

export function SupplierCoilShortfallList({ variance }) {
  if (!variance?.shortPos?.length) return null;
  return (
    <section id="sp-shortfall" className="rounded-zarewa border border-amber-100 bg-white shadow-sm p-5 mb-8 scroll-mt-28">
      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 flex items-center gap-2">
        <Scale size={16} /> Coil kg short vs purchase
      </h3>
      <p className="text-ui-xs text-slate-500 mb-3">
        Weighbridge kg can be lower than kg purchased. That shortfall is recorded here — it does not stay as an
        open commitment once the coils are received.
      </p>
      <ul className="space-y-2">
        {variance.shortPos.map((row) => (
          <li
            key={row.poID}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-xs"
          >
            <p className="font-mono font-bold text-zarewa-teal">{row.poID}</p>
            <p className="font-semibold text-amber-900 tabular-nums">
              {formatKg(row.landedKg)} / {formatKg(row.orderedKg)} · short {formatKg(row.shortKg)} (
              {row.shortPct.toFixed(1)}%)
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
