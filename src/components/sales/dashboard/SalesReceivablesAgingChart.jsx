import React from 'react';
import { formatNgn } from '../../../Data/mockData';

const ORDER = [
  ['0_30', '0-30d'],
  ['31_60', '31-60d'],
  ['61_90', '61-90d'],
  ['over_90', '>90d'],
];

export default function SalesReceivablesAgingChart({ buckets }) {
  const max = Math.max(1, ...ORDER.map(([k]) => Number(buckets?.[k]) || 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Receivables aging</h4>
      <div className="mt-2 space-y-2">
        {ORDER.map(([k, label]) => (
          <div key={k} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-600">{label}</span>
              <span className="font-bold text-[#134e4a]">{formatNgn(buckets?.[k] || 0)}</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-amber-500" style={{ width: `${Math.max(4, ((Number(buckets?.[k]) || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

