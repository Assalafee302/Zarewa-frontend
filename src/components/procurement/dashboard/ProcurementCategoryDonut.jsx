import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function ProcurementCategoryDonut({ rows = [] }) {
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Purchase by category</h4>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? <p className="text-xs text-slate-400">No category data</p> : null}
        {rows.map((r) => {
          const pct = total > 0 ? ((Number(r.value) || 0) / total) * 100 : 0;
          return (
            <div key={r.key} className="rounded-lg border border-slate-100 p-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-700 uppercase">{r.key}</span>
                <span className="font-bold text-slate-600">{pct.toFixed(1)}%</span>
              </div>
              <p className="mt-0.5 text-[11px] font-bold text-[#134e4a] tabular-nums">{formatNgn(r.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

