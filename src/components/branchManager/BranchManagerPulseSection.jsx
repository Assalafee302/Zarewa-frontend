import React, { useState } from 'react';
import { ChevronDown, HelpCircle, LayoutDashboard, Radio } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { MANAGER_METRIC_PERIODS, managementPeriodStartISO } from '../../lib/managementLiveFromWorkspace';
import { DashboardKpiStrip } from '../dashboard/DashboardKpiStrip';
import { Card } from '../ui';
import { formatPersonName } from '../../lib/formatPersonName';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * Performance layer — targets, KPI strip, top customers (collapsible).
 */
export function BranchManagerPulseSection({
  displaySnapshots,
  metricPeriod,
  onMetricPeriodChange,
  managerTargetSourceMeta,
  totalOpenActions,
  loading,
  hasWorkspaceData,
  producedSalesProgress,
  productionMetresProgress,
  mayViewReports = false,
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="space-y-6" aria-label="Branch performance">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Performance</h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:border-slate-300"
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded ? (
        <>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#134e4a] via-[#0f3d39] to-[#0a2e2c] text-white p-6 sm:p-8 shadow-lg shadow-teal-950/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <LayoutDashboard size={28} className="text-teal-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/90">
                      {displaySnapshots.periodLabel ?? 'This month'}
                    </p>
                    {hasWorkspaceData ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-200">
                        <Radio size={10} className="text-emerald-300" aria-hidden />
                        Live workspace
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/50">
                        No workspace
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${managerTargetSourceMeta.chipClass}`}
                      title={managerTargetSourceMeta.title}
                    >
                      Targets: {managerTargetSourceMeta.shortLabel}
                    </span>
                  </div>
                  <p className="text-[9px] font-semibold text-teal-200/75 mt-1.5 mb-0 tracking-wide">
                    {managerTargetSourceMeta.line}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3 mb-1" role="group" aria-label="Metrics time range">
                    {MANAGER_METRIC_PERIODS.map((p) => {
                      const on = metricPeriod === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => onMetricPeriodChange(p.key)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border transition-colors ${
                            on
                              ? 'bg-white text-[#0f3d39] border-white shadow-sm'
                              : 'bg-white/5 text-teal-100/90 border-white/15 hover:bg-white/10 hover:border-white/25'
                          }`}
                        >
                          {p.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200/90 mb-1 flex items-center gap-1.5 flex-wrap">
                    <span>Sales produced</span>
                    <span
                      className="inline-flex rounded-full p-0.5 text-teal-200/80 hover:text-white hover:bg-white/10 cursor-help"
                      title="Quotation totals allocated to completed production jobs in this period, by job completion date."
                    >
                      <HelpCircle size={14} aria-hidden />
                    </span>
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                    {formatNgn(displaySnapshots.producedSalesNgn)}
                  </p>
                  <p className="text-[11px] text-teal-100/80 mt-1.5 tabular-nums">
                    Collected on quotations (quote date): {formatNgn(displaySnapshots.paidOnQuotesNgn)}
                  </p>
                  <p className="text-xs text-white/70 mt-2 max-w-md">
                    {totalOpenActions} open action{totalOpenActions === 1 ? '' : 's'} in command queues
                    {loading ? ' · refreshing…' : ''}.
                  </p>
                </div>
              </div>
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-4 lg:max-w-xl">
                <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-teal-200/80">Quotes</p>
                  <p className="text-lg font-black tabular-nums mt-1">{displaySnapshots.quoteCount}</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-teal-200/80">Low stock SKUs</p>
                  <p className="text-lg font-black tabular-nums mt-1">{displaySnapshots.lowStockCount}</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3 sm:col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-teal-200/80">
                    Metres produced (completed jobs)
                  </p>
                  <p className="text-lg font-black tabular-nums mt-1">
                    {Number(displaySnapshots.completedProductionMetres || 0).toLocaleString()} m
                  </p>
                  <p className="text-[8px] font-semibold text-teal-200/70 mt-1.5 leading-snug">
                    Cutting lists (dated in period): {Number(displaySnapshots.metersCuttingLists || 0).toLocaleString()} m
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-teal-100/90 mb-1.5">
                  <span>Produced sales vs target</span>
                  <span className="tabular-nums">{producedSalesProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/25 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-all"
                    style={{ width: `${producedSalesProgress}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-teal-100/90 mb-1.5">
                  <span>Production metres vs target</span>
                  <span className="tabular-nums">{productionMetresProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/25 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${productionMetresProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <DashboardKpiStrip
            sectionClassName=""
            omitMetresAndSales
            metricsWindow={{
              startISO: managementPeriodStartISO(metricPeriod),
              label: displaySnapshots.periodLabel ?? 'This month',
            }}
          />

          {!hasWorkspaceData ? (
            <p className="text-xs font-semibold text-slate-500">Connect to the API for live KPI figures.</p>
          ) : null}

          <Card className="p-5 border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.18em]">
                Top customers ({(displaySnapshots.periodLabel ?? 'this month').toLowerCase()})
              </h3>
              {mayViewReports ? (
                <Link
                  to="/reports"
                  className="text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
                >
                  Full reports
                </Link>
              ) : null}
            </div>
            <div className="space-y-4">
              {displaySnapshots.topByRevenue.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No revenue data for {(displaySnapshots.periodLabel ?? 'this period').toLowerCase()} yet.
                </p>
              ) : (
                displaySnapshots.topByRevenue.map((c, idx) => (
                  <div key={c.customer_id || idx} className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-400 w-5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] font-bold text-slate-800 mb-1 gap-2">
                        <span className="truncate">{formatPersonName(c.customer_name)}</span>
                        <span className="tabular-nums shrink-0 text-[#134e4a]">{formatNgn(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(c.revenue / (displaySnapshots.topByRevenue[0]?.revenue || 1)) * 100}%`,
                          }}
                          className="h-full bg-[#134e4a] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
