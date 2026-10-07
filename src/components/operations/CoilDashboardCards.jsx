import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { buildCoilLife, coilErpKgSafe } from '../../lib/coilExpectedLife';
import { countedCoilNos, readCoilCountSession } from '../../lib/coilCountSession';
import { summarizePaidNotReceivedPos } from '../../lib/supplierAdvanceBuckets';
import { formatNgn } from '../../lib/formatNgn';

function Card({ label, value, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-zarewa-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30"
    >
      <p className="text-ui-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-zarewa-teal">{value}</p>
      {hint ? <p className="mt-1 text-ui-xs font-medium text-slate-500">{hint}</p> : null}
    </button>
  );
}

export function CoilDashboardCardGrid({ stats, onOffExpected, onPaid, onWatch, onNotSeen }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-screen="dashboard-cards">
      <Card
        label="Coils off expected"
        value={stats.offCount}
        hint={`${Number(stats.offKg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
        onClick={onOffExpected}
      />
      <Card
        label="Paid – not received POs"
        value={stats.paidCount}
        hint={formatNgn(stats.paidNgn)}
        onClick={onPaid}
      />
      <Card label="Watch list coils" value={stats.watchCount} hint="Still on hand" onClick={onWatch} />
      <Card
        label="Coils not seen at last count"
        value={stats.notSeen}
        hint={stats.notSeenHint || 'On hand, not on the sheet'}
        onClick={onNotSeen}
      />
    </div>
  );
}

export function CoilDashboardCards() {
  const navigate = useNavigate();
  const { coilLots } = useInventory();
  const ws = useWorkspace();
  const jobCoils = ws?.snapshot?.productionJobCoils || [];
  const purchaseOrders = ws?.snapshot?.purchaseOrders || [];

  const stats = useMemo(() => {
    const jobsByCoil = new Map();
    for (const row of jobCoils) {
      const key = String(row.coilNo || '').trim().toLowerCase();
      if (!key) continue;
      if (!jobsByCoil.has(key)) jobsByCoil.set(key, []);
      jobsByCoil.get(key).push(row);
    }
    const counted = countedCoilNos(readCoilCountSession());
    let offCount = 0;
    let offKg = 0;
    let watchCount = 0;
    let notSeen = 0;
    for (const lot of coilLots || []) {
      const key = String(lot.coilNo || '').trim().toLowerCase();
      const life = buildCoilLife(lot, jobsByCoil.get(key) || []);
      if (life.onWatchList) {
        offCount += 1;
        offKg += Math.abs(life.varianceKg || 0);
        if (life.erpKg > 0.05 && lot.currentStatus !== 'Consumed' && lot.currentStatus !== 'Finished') {
          watchCount += 1;
        }
      }
      if (coilErpKgSafe(lot) > 0.05 && !counted.has(key)) notSeen += 1;
    }
    const paid = summarizePaidNotReceivedPos(purchaseOrders);
    return { offCount, offKg, watchCount, notSeen, paidCount: paid.count, paidNgn: paid.ngn };
  }, [coilLots, jobCoils, purchaseOrders]);

  const goInventory = (coilLifeFilter) => {
    navigate('/operations', { state: { focusOpsTab: 'inventory', coilLifeFilter, stockReceiveKind: 'coil' } });
  };

  return (
    <CoilDashboardCardGrid
      stats={{
        ...stats,
        notSeenHint: stats.notSeen && !readCoilCountSession() ? 'No count saved yet' : 'On hand, not on the sheet',
      }}
      onOffExpected={() => goInventory('off')}
      onPaid={() => navigate('/procurement')}
      onWatch={() => goInventory('watch')}
      onNotSeen={() => goInventory('notCounted')}
    />
  );
}
