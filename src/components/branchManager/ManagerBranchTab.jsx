import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Package } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { formatPersonName } from '../../lib/formatPersonName';
import { MANAGER_METRIC_PERIODS } from '../../lib/managementLiveFromWorkspace';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';
import { useInventory } from '../../context/InventoryContext';
import { FinanceSequencePanel } from '../layout';
import {
  ManagerFulfillmentPipelinePanel,
  ManagerReceivablesPanel,
} from './ManagerDeskExtras.jsx';
import { ManagerShiftExtras } from './ManagerShiftExtras.jsx';
import { ManagerAssociatedStaffPanel } from './ManagerAssociatedStaffPanel.jsx';

function pctWidth(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function formatMetres(n) {
  return `${Number(n || 0).toLocaleString('en-NG')} m`;
}

function PeriodMeterRow({ label, value, pct, barClass, hint }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-[11px] font-semibold text-slate-600">
        <span className="min-w-0">{label}</span>
        <span className="shrink-0 tabular-nums text-zarewa-teal">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pctWidth(pct)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

function StockAtRisk({ products, onOpenStockRegister }) {
  const rows = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .map((p) => {
        const qty = Number(p.quantity ?? p.qty ?? p.onHand ?? 0) || 0;
        const threshold = Number(p.lowStockThreshold ?? p.reorderLevel ?? 10) || 10;
        const tone = qty <= 0 ? 'rose' : qty <= threshold ? 'amber' : 'ok';
        return {
          id: p.id || p.sku || p.name,
          name: p.name || p.sku || 'SKU',
          qty,
          threshold,
          tone,
        };
      })
      .filter((r) => r.tone !== 'ok')
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 8);
  }, [products]);

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-4 sm:p-5 bg-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Package size={15} className="shrink-0 text-zarewa-teal" aria-hidden />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zarewa-teal">Stock at risk</h3>
            <p className="text-[11px] text-slate-500">Only SKUs at or below reorder — not the full catalogue.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-zarewa-teal hover:text-zarewa-teal"
            onClick={() => onOpenStockRegister?.()}
          >
            Register
          </button>
          <RouterLink
            to="/operations"
            state={{ focusOpsTab: 'inventory' }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 no-underline hover:border-zarewa-teal hover:text-zarewa-teal"
          >
            Inventory
          </RouterLink>
        </div>
      </div>
      {!rows.length ? (
        <p className="py-4 text-center text-xs text-slate-500">No SKUs below reorder level in this branch.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-3 font-semibold">SKU</th>
              <th className="py-1.5 pr-3 text-right font-semibold">On hand</th>
              <th className="py-1.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="py-2 pr-3 font-semibold text-slate-800">{r.name}</td>
                <td className="py-2 pr-3 text-right font-bold tabular-nums">{r.qty}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      r.tone === 'rose'
                        ? 'border-rose-200 bg-rose-100 text-rose-900'
                        : 'border-amber-200 bg-amber-100 text-amber-900'
                    }`}
                  >
                    {r.tone === 'rose' ? 'Out' : 'Low'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </FinanceSequencePanel>
  );
}

/**
 * Merged Insights + Branch Operations + Performance: exceptions, money at risk, and period tracking.
 */
export function ManagerBranchTab({
  displaySnapshots,
  metricPeriod,
  onMetricPeriodChange,
  managerTargetSourceMeta,
  producedSalesProgress,
  productionMetresProgress,
  mayViewReports = false,
  loading = false,
  quotations = [],
  salesAvailable = true,
  materialCount = 0,
  attendancePendingCount = 0,
  onOpenMaterialQueue,
  onOpenStockRegister,
  branchId,
  coilRequests = [],
  onStockApproved,
  peopleGlanceAvailable = false,
  customerIssuesAvailable = false,
}) {
  const { products } = useInventory();
  const [benchmark, setBenchmark] = useState(null);

  useEffect(() => {
    if (!mayViewReports) {
      setBenchmark(null);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const benchQ = await apiFetch('/api/management/branch-benchmark?period=month').catch(() => ({
        ok: false,
      }));
      if (cancelled) return;
      setBenchmark(benchQ.ok && benchQ.data?.ok ? benchQ.data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mayViewReports]);

  const salesPct = pctWidth(producedSalesProgress);
  const metresPct = pctWidth(productionMetresProgress);
  const producedMetres = Number(displaySnapshots?.completedProductionMetres || 0);
  const cuttingListMetres = Number(displaySnapshots?.metersCuttingLists || 0);
  const producedOfCuttingPct =
    cuttingListMetres > 0 ? Math.round((producedMetres / cuttingListMetres) * 100) : 0;
  const rankLine =
    benchmark?.comparisonAvailable && benchmark.yourRank
      ? `Rank ${benchmark.yourRank} of ${benchmark.peerCount} branches this month`
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">
          {displaySnapshots?.periodLabel ?? 'This period'}
          {loading ? ' · refreshing…' : ''}
          {rankLine ? ` · ${rankLine}` : ''}
        </p>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Metrics time range">
          {MANAGER_METRIC_PERIODS.map((p) => {
            const on = metricPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onMetricPeriodChange?.(p.key)}
                className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  on
                    ? 'border-zarewa-teal bg-zarewa-teal text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {p.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Attendance roll</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {attendancePendingCount > 0
                ? `${attendancePendingCount} staff not marked today`
                : 'Today’s roll is complete'}
            </p>
          </div>
          <RouterLink
            to={TEAM_HR_ATTENDANCE_PATH}
            className="shrink-0 rounded-lg bg-zarewa-teal px-2.5 py-1.5 text-[11px] font-bold text-white no-underline hover:brightness-105"
          >
            My Team
          </RouterLink>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Material exceptions</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {materialCount > 0 ? `${materialCount} awaiting your approval` : 'No open material exceptions'}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-zarewa-teal hover:text-zarewa-teal"
            onClick={() => onOpenMaterialQueue?.()}
          >
            Review
          </button>
        </div>
      </div>

      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-4 sm:p-5 bg-white">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zarewa-teal">Period vs target</h3>
          <span className="text-[11px] font-semibold text-slate-500" title={managerTargetSourceMeta?.title}>
            {managerTargetSourceMeta?.shortLabel || 'Targets'}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PeriodMeterRow
            label="Produced sales"
            value={formatNgn(displaySnapshots?.producedSalesNgn)}
            pct={salesPct}
            barClass="bg-zarewa-teal"
            hint={`${salesPct}% of target`}
          />
          <PeriodMeterRow
            label="Metres produced"
            value={formatMetres(producedMetres)}
            pct={metresPct}
            barClass="bg-emerald-600"
            hint={`${metresPct}% of metre target · completed jobs`}
          />
          <PeriodMeterRow
            label="Metres in cutting list"
            value={formatMetres(cuttingListMetres)}
            pct={producedOfCuttingPct}
            barClass="bg-sky-600"
            hint={
              cuttingListMetres > 0
                ? producedOfCuttingPct > 100
                  ? `Produced exceeds lists dated this period (${formatMetres(producedMetres)})`
                  : `${producedOfCuttingPct}% of cutting-list metres already produced`
                : 'No cutting lists dated in this period'
            }
          />
        </div>
      </FinanceSequencePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockAtRisk products={products} onOpenStockRegister={onOpenStockRegister} />
        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-4 sm:p-5 bg-white">
          <h3 className="mb-3 text-sm font-bold text-zarewa-teal">Customers moving volume</h3>
          {!displaySnapshots?.topCustomers?.length ? (
            <p className="py-4 text-center text-xs text-slate-500">No customer activity for this period yet.</p>
          ) : (
            <ul className="space-y-3">
              {displaySnapshots.topCustomers.slice(0, 5).map((c, idx) => (
                <li key={c.customer_id || idx}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-slate-800">
                    <span className="min-w-0 truncate">
                      {idx + 1}. {formatPersonName(c.customer_name)}
                    </span>
                    <span className="shrink-0 tabular-nums text-zarewa-teal">
                      {Number(c.cuttingListMeters || 0).toLocaleString()} m
                    </span>
                  </div>
                  <p className="mb-1 text-[11px] tabular-nums text-slate-500">
                    Collected {formatNgn(c.netCollectedNgn)}
                  </p>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-zarewa-teal"
                      style={{
                        width: `${pctWidth(
                          (Number(c.cuttingListMeters || 0) /
                            (Number(displaySnapshots.topCustomers[0]?.cuttingListMeters) || 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FinanceSequencePanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ManagerFulfillmentPipelinePanel quotations={quotations} />
        <ManagerReceivablesPanel available={salesAvailable} />
      </div>

      <ManagerAssociatedStaffPanel />

      <ManagerShiftExtras
        branchId={branchId}
        coilRequests={coilRequests}
        onStockApproved={onStockApproved}
        quotations={quotations}
        peopleGlanceAvailable={peopleGlanceAvailable}
        customerIssuesAvailable={customerIssuesAvailable}
      />
    </div>
  );
}
