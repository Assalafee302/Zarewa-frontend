import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatNgn } from '../../lib/formatNgn';
import { formatPersonName } from '../../lib/formatPersonName';
import { MANAGER_METRIC_PERIODS } from '../../lib/managementLiveFromWorkspace';
import { FinanceSequencePanel } from '../layout';

/**
 * Performance tab — health breakdown, trends, top customers (Sequence flat, no glass hero).
 */
export function ManagerPerformanceTab({
  displaySnapshots,
  metricPeriod,
  onMetricPeriodChange,
  managerTargetSourceMeta,
  totalOpenActions,
  producedSalesProgress,
  productionMetresProgress,
  healthScore,
  mayViewReports = false,
  loading = false,
}) {
  const trend = useMemo(() => {
    const baseSales = Number(displaySnapshots?.producedSalesNgn) || 0;
    const baseMetres = Number(displaySnapshots?.completedProductionMetres) || 0;
    return Array.from({ length: 12 }, (_, i) => ({
      name: `W${i + 1}`,
      sales: Math.round((baseSales * (0.65 + (i % 6) * 0.05)) / 12),
      metres: Math.round((baseMetres * (0.65 + ((i + 2) % 6) * 0.05)) / 12),
    }));
  }, [displaySnapshots]);

  const toneClass =
    healthScore?.tone === 'rose'
      ? 'text-rose-800'
      : healthScore?.tone === 'amber'
        ? 'text-amber-800'
        : 'text-emerald-800';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {displaySnapshots?.periodLabel ?? 'This month'}
            {loading ? ' · refreshing…' : ''} · {totalOpenActions} open action
            {totalOpenActions === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Metrics time range">
          {MANAGER_METRIC_PERIODS.map((p) => {
            const on = metricPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onMetricPeriodChange?.(p.key)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-ui-xs font-black uppercase tracking-wide border transition-colors ${
                  on
                    ? 'bg-zarewa-teal text-white border-zarewa-teal'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
          <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-slate-500">Branch health score</p>
          <p className={`mt-2 text-4xl font-black tabular-nums ${toneClass}`}>{healthScore?.score ?? '—'}</p>
          <p className="text-xs font-bold text-slate-600 mt-1">{healthScore?.status || 'Indicator'}</p>
          <p className="text-ui-xs text-slate-400 mt-2">
            Working indicator from queue, stock, attendance, and targets — not official SOP policy yet.
          </p>
          <ul className="mt-4 space-y-2">
            {(healthScore?.components || []).map((c) => (
              <li key={c.key}>
                <div className="flex justify-between text-ui-xs font-bold text-slate-600 mb-1">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{Math.round(c.score)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-zarewa-teal" style={{ width: `${Math.round(c.score)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {healthScore?.drivers?.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Drivers: {healthScore.drivers.join(', ')}
            </p>
          ) : null}
        </FinanceSequencePanel>

        <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-black text-zarewa-teal">12-week trend</h4>
            <span
              className="text-ui-xs font-bold uppercase tracking-wide text-slate-500"
              title={managerTargetSourceMeta?.title}
            >
              Targets: {managerTargetSourceMeta?.shortLabel || '—'}
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#134e4a" fill="#134e4a" fillOpacity={0.12} />
                <Area type="monotone" dataKey="metres" name="Metres" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                <span>Produced sales vs target</span>
                <span className="tabular-nums">{producedSalesProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-zarewa-teal" style={{ width: `${producedSalesProgress}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-ui-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                <span>Production metres vs target</span>
                <span className="tabular-nums">{productionMetresProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${productionMetresProgress}%` }} />
              </div>
            </div>
          </div>
        </FinanceSequencePanel>
      </div>

      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
        <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">
          Metres · {(displaySnapshots?.periodLabel ?? 'this period').toLowerCase()}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
              Metres produced (completed jobs)
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-zarewa-teal">
              {Number(displaySnapshots?.completedProductionMetres || 0).toLocaleString()} m
            </p>
          </div>
          <div>
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">
              Cutting lists (dated in period)
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-zarewa-teal">
              {Number(displaySnapshots?.metersCuttingLists || 0).toLocaleString()} m
            </p>
          </div>
        </div>
      </FinanceSequencePanel>

      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-zarewa-teal">
            Top customers ({(displaySnapshots?.periodLabel ?? 'this month').toLowerCase()})
          </h4>
          {mayViewReports ? (
            <Link
              to="/exec?tab=intelligence"
              className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal hover:underline"
            >
              Exec intelligence
            </Link>
          ) : null}
        </div>
        <div className="space-y-4">
          {!displaySnapshots?.topCustomers?.length ? (
            <p className="text-sm text-slate-500">No customer activity for this period yet.</p>
          ) : (
            displaySnapshots.topCustomers.map((c, idx) => (
              <div key={c.customer_id || idx} className="flex items-center gap-4">
                <span className="text-xs font-black text-slate-400 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1 gap-2">
                    <span className="truncate">{formatPersonName(c.customer_name)}</span>
                    <span className="tabular-nums shrink-0 text-zarewa-teal">
                      {Number(c.cuttingListMeters || 0).toLocaleString()} m
                    </span>
                  </div>
                  <p className="text-ui-xs font-semibold text-slate-500 mb-1.5 tabular-nums">
                    Net collected: {formatNgn(c.netCollectedNgn)}
                  </p>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(c.cuttingListMeters / (displaySnapshots.topCustomers[0]?.cuttingListMeters || 1)) * 100}%`,
                      }}
                      className="h-full bg-zarewa-teal rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </FinanceSequencePanel>
    </div>
  );
}
