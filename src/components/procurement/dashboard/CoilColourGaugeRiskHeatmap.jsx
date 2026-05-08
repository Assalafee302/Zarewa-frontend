import React from 'react';

function riskClass(days) {
  if (!(days > 0)) return 'bg-rose-100 text-rose-900 border-rose-200';
  if (days < 14) return 'bg-rose-100 text-rose-900 border-rose-200';
  if (days < 30) return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-emerald-100 text-emerald-900 border-emerald-200';
}

export default function CoilColourGaugeRiskHeatmap({ rows = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Coil risk (colour × gauge)</h4>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 ? <p className="text-xs text-slate-400">No coil risk rows</p> : null}
        {rows.map((r) => (
          <div key={r.key} className={`rounded-lg border px-2.5 py-2 text-[10px] ${riskClass(r.daysCover)}`}>
            <p className="font-black uppercase">
              {r.color} · {r.gauge}
            </p>
            <p className="mt-1">Stock: {Math.round(r.stockKg)} kg</p>
            <p>Daily use: {r.avgDailyKg.toFixed(2)} kg/day</p>
            <p className="font-bold">Days cover: {Number.isFinite(r.daysCover) ? r.daysCover.toFixed(1) : '—'}</p>
            <p className="mt-1">Reorder: {Math.max(0, Math.round(r.recommendedReorderKg))} kg</p>
          </div>
        ))}
      </div>
    </div>
  );
}

