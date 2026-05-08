import React from 'react';
import { formatNgn } from '../../../Data/mockData';

export default function ProcurementAlertsPanel({ alerts = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Alerts & exceptions</h4>
      <ul className="mt-2 space-y-1.5">
        {alerts.length === 0 ? <li className="text-xs text-slate-400">No active procurement alerts.</li> : null}
        {alerts.map((a, idx) => (
          <li key={`${a.type}-${idx}`} className="rounded-lg border border-slate-100 px-2 py-1.5 text-[10px]">
            <p className="font-semibold text-slate-700">
              {a.severity?.toUpperCase()} · {a.type}
            </p>
            <p className="text-slate-500">{a.message}</p>
            {typeof a.amountNgn === 'number' ? (
              <p className="text-[#134e4a] font-bold tabular-nums">{formatNgn(a.amountNgn)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

