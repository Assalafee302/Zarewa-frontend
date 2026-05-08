import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SalesDemandMixPanel({ rows = [], bookedVsProduced }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Demand mix & booked vs produced</h4>
      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2 text-[10px] text-slate-600">
        <p>
          Booked value: <span className="font-bold text-[#134e4a]">{formatNgn(bookedVsProduced?.bookedNgn || 0)}</span>
        </p>
        <p>
          Produced metres: <span className="font-bold text-[#134e4a] tabular-nums">{Math.round(bookedVsProduced?.producedMeters || 0).toLocaleString()}</span>
        </p>
        <p>
          Produced value: <span className="font-bold text-[#134e4a]">{formatNgn(bookedVsProduced?.producedValueNgn || 0)}</span>
        </p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {rows.length === 0 ? <li className="text-xs text-slate-400">No demand mix rows yet.</li> : null}
        {rows.map((r) => (
          <li key={r.key} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">{r.key}</span>
              <span className="font-bold text-[#134e4a]">{formatNgn(r.valueNgn)}</span>
            </div>
            <p className="text-slate-500 mt-0.5">{Math.round(r.metres).toLocaleString()} m</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

