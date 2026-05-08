import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SalesTopCustomersPanel({ rows = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Top customers</h4>
      <ul className="mt-2 space-y-1.5">
        {rows.length === 0 ? <li className="text-xs text-slate-400">No customer ranking yet.</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 truncate">{r.name}</span>
              <span className="font-bold tabular-nums text-[#134e4a]">{formatNgn(r.value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

