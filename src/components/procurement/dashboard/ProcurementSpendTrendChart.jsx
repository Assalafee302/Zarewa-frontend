import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function ProcurementSpendTrendChart({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Spend trend</h4>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-xs text-slate-400">No trend data</p> : null}
        {rows.map((r) => (
          <div key={r.key} className="space-y-1">
            <div className="flex items-center justify-between text-ui-xs">
              <span className="font-semibold text-slate-600">{r.key}</span>
              <span className="font-bold text-zarewa-teal tabular-nums">{formatNgn(r.value)}</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-zarewa-teal" style={{ width: `${Math.max(4, (Number(r.value) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

