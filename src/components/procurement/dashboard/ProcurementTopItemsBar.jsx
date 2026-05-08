import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function ProcurementTopItemsBar({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.spendNgn) || 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Top purchased items</h4>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? <p className="text-xs text-slate-400">No items yet</p> : null}
        {rows.map((r) => (
          <div key={r.itemKey} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-600">{`${r.poKind} · ${r.color} · ${r.gauge}`}</span>
              <span className="font-bold tabular-nums text-[#134e4a]">{formatNgn(r.spendNgn)}</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-teal-600" style={{ width: `${Math.max(4, (Number(r.spendNgn) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

