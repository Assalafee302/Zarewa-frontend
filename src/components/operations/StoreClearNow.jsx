import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Package,
  Scissors,
  Truck,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import {
  buildPendingProductionsOverview,
  liveCoilWeightKgForOverview,
} from '../../lib/operationsProductionOverviewCore';
import { buildStoreClearanceRows, buildStorePulseCounts } from '../../lib/storeClearanceRank';
import { buildIdleClearanceRows, buildLastUsedByCoilNo, IDLE_CLEAR_NOW_MAX } from '../../lib/storeIdle';
import { DeliveryPodPanel } from './DeliveryPodPanel';
import { ReportFaultPanel } from './ReportFaultPanel';
import { RequestSuppliesPanel } from './RequestSuppliesPanel';

function severityBorder(sev) {
  if (sev === 'critical') return 'border-rose-200 bg-rose-50/80';
  if (sev === 'high') return 'border-amber-200 bg-amber-50/70';
  if (sev === 'warn') return 'border-amber-100 bg-amber-50/40';
  return 'border-slate-200 bg-slate-50/50';
}

function PulseChip({ label, count, tone = 'slate', onClick, active }) {
  if (!count && !active) return null;
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-950 hover:bg-rose-100/80',
    amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/80',
    sky: 'border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100/80',
    teal: 'border-teal-200 bg-teal-50 text-teal-950 hover:bg-teal-100/80',
    slate: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-ui-xs font-bold transition ${
        tones[tone] || tones.slate
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums font-black">{count}</span>
    </button>
  );
}

/**
 * Store desk — Clear now (priority + pulse + ranked clearance).
 */
export function StoreClearNow({
  coilLots,
  cuttingLists,
  productionQueueModel,
  productionQueueStats,
  hasWorkspaceData,
  receiveCount = 0,
  pendingMexCount = 0,
  onGoRegister,
  onGoReceive,
  onGoExceptions,
  onGoOnHand,
  onRequestStock,
  onMonthEndStock,
  onOpenCoil,
  onRequestRestock,
  restockRows = [],
  movements = [],
  branchId = '',
  focusDeliveries = false,
}) {
  const [podPendingCount, setPodPendingCount] = useState(0);
  const [showPodPanel, setShowPodPanel] = useState(false);

  const loadPodCount = useCallback(async () => {
    const res = await apiFetch('/api/deliveries').catch(() => ({ ok: false }));
    if (!res.ok) {
      setPodPendingCount(0);
      return;
    }
    const rows = Array.isArray(res.data?.deliveries) ? res.data.deliveries : [];
    const pending = rows.filter((d) => {
      const st = String(d.status || '').toLowerCase();
      return st && st !== 'delivered' && st !== 'cancelled';
    }).length;
    setPodPendingCount(pending);
  }, []);

  useEffect(() => {
    void loadPodCount();
  }, [loadPodCount, branchId]);

  useEffect(() => {
    if (focusDeliveries) {
      setShowPodPanel(true);
      const t = window.setTimeout(() => {
        document.getElementById('store-clear-now-pod')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [focusDeliveries]);

  const pendingProductions = useMemo(
    () =>
      buildPendingProductionsOverview({
        cuttingLists,
        productionQueueModel,
        hasWorkspaceData,
      }),
    [cuttingLists, productionQueueModel, hasWorkspaceData]
  );

  const thinCoilCount = useMemo(() => {
    let n = 0;
    for (const c of coilLots || []) {
      if (c.currentStatus === 'Consumed' || c.currentStatus === 'Finished') continue;
      const kg = liveCoilWeightKgForOverview(c);
      if (kg > 0 && kg < 85) n += 1;
    }
    return n;
  }, [coilLots]);

  const idleRows = useMemo(() => {
    const map = buildLastUsedByCoilNo(movements);
    return buildIdleClearanceRows(coilLots, map, { max: IDLE_CLEAR_NOW_MAX });
  }, [coilLots, movements]);

  const clearanceRows = useMemo(
    () =>
      buildStoreClearanceRows({
        pendingProductions,
        receiveCount,
        podPendingCount,
        pendingMexCount,
        thinCoilCount,
        idleRows,
        restockRows,
        maxRows: 10,
      }),
    [pendingProductions, receiveCount, podPendingCount, pendingMexCount, thinCoilCount, idleRows, restockRows]
  );

  const pulse = useMemo(
    () =>
      buildStorePulseCounts({
        pendingProductions,
        receiveCount,
        podPendingCount,
        pendingMexCount,
        noCoilCount: productionQueueStats?.noCoil || 0,
      }),
    [pendingProductions, receiveCount, podPendingCount, pendingMexCount, productionQueueStats]
  );

  const priority = clearanceRows[0] || null;

  const openOnHand = (opts) => {
    if (typeof onGoOnHand !== 'function') return;
    if (opts && typeof opts === 'object') onGoOnHand(opts);
    else onGoOnHand(opts || 'coil');
  };

  const runAction = (row) => {
    const action = row?.action;
    if (action === 'register') {
      onGoRegister?.({ highlightId: row.refId || '', filter: row.filter });
      return;
    }
    if (action === 'pod') {
      setShowPodPanel(true);
      return;
    }
    if (action === 'receive') {
      onGoReceive?.();
      return;
    }
    if (action === 'exceptions') {
      onGoExceptions?.();
      return;
    }
    if (action === 'onhand_coil') {
      openOnHand({ kind: 'coil', specBoardFilter: 'thin' });
      return;
    }
    if (action === 'open_coil' && row.refId) {
      onOpenCoil?.(row.refId);
      return;
    }
    if (action === 'restock' && row.restock) {
      onRequestRestock?.(row.restock);
    }
  };

  const deskClear = clearanceRows.length === 0;

  return (
    <div className="space-y-4">
      {priority ? (
        <div
          className={`rounded-xl border px-3 py-3 sm:px-4 ${severityBorder(priority.severity)}`}
          role="status"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Priority</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">{priority.title}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-700 leading-snug">{priority.detail}</p>
              {priority.meta ? (
                <p className="mt-0.5 text-ui-xs text-slate-500 truncate">{priority.meta}</p>
              ) : null}
            </div>
            <button type="button" className="z-btn-primary text-ui-xs shrink-0" onClick={() => runAction(priority)}>
              {priority.cta}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 sm:px-4" role="status">
          <p className="text-sm font-black text-emerald-950 flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden />
            Desk clear
          </p>
          <p className="mt-0.5 text-xs font-medium text-emerald-900/80">
            No urgent register, receive, POD, restock, or idle items. Optional: review Spec board on On hand.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2" aria-label="Store pulse">
        <PulseChip
          label="Register"
          count={pulse.register}
          tone="amber"
          onClick={() => onGoRegister?.({})}
        />
        <PulseChip
          label="Need coil"
          count={pulse.needCoil}
          tone="rose"
          onClick={() => onGoRegister?.({ filter: 'no_coil' })}
        />
        <PulseChip
          label="POD"
          count={pulse.pod}
          tone="sky"
          onClick={() => setShowPodPanel(true)}
        />
        <PulseChip label="Receive" count={pulse.receive} tone="teal" onClick={() => onGoReceive?.()} />
        <PulseChip
          label="Exceptions"
          count={pulse.exceptions}
          tone="amber"
          onClick={() => onGoExceptions?.()}
        />
        <PulseChip
          label="Idle"
          count={idleRows.length}
          tone="amber"
          onClick={() => openOnHand({ kind: 'coil', specBoardFilter: 'idle' })}
        />
        <PulseChip
          label="Restock"
          count={(restockRows || []).length}
          tone="amber"
          onClick={() => {
            const list = restockRows || [];
            const hasCoil = list.some(
              (r) => r?.restock?.family !== 'stone' && r?.restock?.unit !== 'm' && !String(r?.id || '').includes('stone')
            );
            const hasStone = list.some(
              (r) =>
                r?.restock?.family === 'stone' ||
                r?.restock?.unit === 'm' ||
                String(r?.id || '').includes('stone')
            );
            // Prefer coil Spec board when both exist (primary buy path); else stone.
            openOnHand({
              kind: hasCoil || !hasStone ? 'coil' : 'stone_meter',
              specBoardFilter: 'below_min',
            });
          }}
        />
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
        <header className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zarewa-teal">Clear now</h3>
            <p className="mt-0.5 text-ui-xs font-medium text-slate-500">Ranked work — every row opens the right desk</p>
          </div>
          {onMonthEndStock ? (
            <button
              type="button"
              onClick={onMonthEndStock}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ClipboardCheck size={12} aria-hidden />
              Month-end
            </button>
          ) : null}
        </header>
        <div className="p-3 sm:p-4">
          {clearanceRows.length === 0 ? (
            <p className="text-ui-xs text-slate-500 py-2">Nothing queued.</p>
          ) : (
            <ul className="space-y-2">
              {clearanceRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => runAction(row)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition hover:brightness-[0.99] ${severityBorder(
                      row.severity
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{row.title}</span>
                          {row.refId ? (
                            <span className="font-mono text-ui-xs font-bold text-zarewa-teal">{row.refId}</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-ui-xs font-medium text-slate-700 truncate">{row.detail}</p>
                        {row.meta ? (
                          <p className="text-ui-xs text-slate-500 truncate">{row.meta}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-ui-xs font-black uppercase tracking-wide text-zarewa-teal">
                        {row.cta}
                        <ChevronRight size={12} aria-hidden />
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className={`grid grid-cols-3 gap-2 rounded-xl border px-3 py-2.5 ${
          deskClear ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60'
        }`}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Open receive</p>
          <p className="text-sm font-black tabular-nums text-slate-900">{pulse.receive}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">POD open</p>
          <p className="text-sm font-black tabular-nums text-slate-900">{pulse.pod}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Exceptions</p>
          <p className="text-sm font-black tabular-nums text-slate-900">{pulse.exceptions}</p>
        </div>
      </div>

      {(showPodPanel || focusDeliveries || pulse.pod > 0) && (
        <div id="store-clear-now-pod">
          <DeliveryPodPanel branchId={branchId} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Quick actions</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onGoReceive?.()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/80 px-2.5 py-1.5 text-ui-xs font-bold text-teal-900 hover:bg-teal-100/70"
          >
            <Truck size={12} aria-hidden />
            Receive
          </button>
          <button
            type="button"
            onClick={() => onGoRegister?.({})}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Scissors size={12} aria-hidden />
            Register
          </button>
          <button
            type="button"
            onClick={() => openOnHand({ kind: 'coil' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Factory size={12} aria-hidden />
            On hand
          </button>
          <button
            type="button"
            onClick={() => onRequestStock?.()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Package size={12} aria-hidden />
            Request stock
          </button>
          <ReportFaultPanel branchId={branchId} />
          <RequestSuppliesPanel
            branchId={branchId}
            onGoInventory={(kind) => openOnHand(typeof kind === 'string' ? { kind } : kind || { kind: 'coil' })}
          />
        </div>
      </div>

      {pulse.needCoil > 0 ? (
        <p className="text-ui-xs font-semibold text-rose-900 flex items-center gap-1.5">
          <AlertTriangle size={12} aria-hidden />
          {pulse.needCoil} job(s) blocked without coil — allocate from Register.
        </p>
      ) : null}
    </div>
  );
}

export default StoreClearNow;
