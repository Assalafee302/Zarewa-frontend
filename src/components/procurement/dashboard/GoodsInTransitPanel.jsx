import React, { useMemo } from 'react';
import { isOpenInTransitLoadStatus } from '../../../lib/inTransitVisibility.js';

export default function GoodsInTransitPanel({ loads = [] }) {
  const openLoads = useMemo(
    () => (loads || []).filter((l) => isOpenInTransitLoadStatus(l?.status)),
    [loads]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Goods in transit</h4>
      <ul className="mt-2 space-y-1.5">
        {openLoads.length === 0 ? <li className="text-xs text-slate-400">No active transit loads.</li> : null}
        {openLoads.slice(0, 8).map((l) => (
          <li key={l.id || `${l.purchaseOrderId}-${l.status}`} className="rounded-lg border border-slate-100 px-2 py-1.5 text-ui-xs">
            <p className="font-semibold text-slate-700">
              {l.purchaseOrderId || l.poID || 'PO'} · {l.supplierName || 'Supplier'}
            </p>
            <p className="text-slate-500">
              {l.transportAgentName || '—'} · {l.status || 'in transit'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

