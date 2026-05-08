import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SalesRevenueTrendChart({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(Number(r.salesNgn) || 0, Number(r.receiptsNgn) || 0)));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Revenue vs receipts trend</h4>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? <p className="text-xs text-slate-400">No trend data.</p> : null}
        {rows.map((r) => (
          <div key={r.key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-600">{r.key}</span>
              <span className="font-bold text-[#134e4a]">
                {formatNgn(r.salesNgn)} / {formatNgn(r.receiptsNgn)}
              </span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-[#134e4a]" style={{ width: `${Math.max(4, ((Number(r.salesNgn) || 0) / max) * 100)}%` }} />
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.max(4, ((Number(r.receiptsNgn) || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

