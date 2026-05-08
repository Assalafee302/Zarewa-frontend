import React, { useMemo, useState } from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SalesTopCustomersPanel({ rowsByPaid = [], rowsByMeters = [] }) {
  const [metric, setMetric] = useState('paid');
  const rows = useMemo(() => (metric === 'meters' ? rowsByMeters : rowsByPaid), [metric, rowsByMeters, rowsByPaid]);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Top customers</h4>
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setMetric('paid')}
            className={`px-2 py-1 text-[9px] font-semibold rounded ${metric === 'paid' ? 'bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            By amount paid
          </button>
          <button
            type="button"
            onClick={() => setMetric('meters')}
            className={`px-2 py-1 text-[9px] font-semibold rounded ${metric === 'meters' ? 'bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            By meters
          </button>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.length === 0 ? <li className="text-xs text-slate-400">No customer ranking yet.</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 truncate">{r.name}</span>
              <span className="font-bold tabular-nums text-[#134e4a]">
                {metric === 'meters'
                  ? `${Math.round(Number(r.metres) || 0).toLocaleString()} m`
                  : formatNgn(Number(r.paidNgn) || 0)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

