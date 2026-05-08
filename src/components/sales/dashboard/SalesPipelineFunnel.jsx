import React from 'react';

const LABELS = {
  requested: 'Requested',
  approved: 'Approved',
  paid: 'Paid',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function SalesPipelineFunnel({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.count) || 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Quotation pipeline</h4>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div key={r.stage} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-600">{LABELS[r.stage] || r.stage}</span>
              <span className="font-bold text-[#134e4a]">{r.count}</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.max(4, ((Number(r.count) || 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

