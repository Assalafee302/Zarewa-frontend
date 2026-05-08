import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function SalesAlertsPanel({ alerts = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Alerts</h4>
      <ul className="mt-2 space-y-1.5">
        {alerts.length === 0 ? <li className="text-xs text-slate-400">No active exceptions.</li> : null}
        {alerts.map((a, idx) => (
          <li key={`${a.type}-${idx}`} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px]">
            <p className="font-semibold text-slate-700">{a.message}</p>
            {a.amountNgn ? <p className="mt-0.5 font-bold text-[#134e4a]">{formatNgn(a.amountNgn)}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

