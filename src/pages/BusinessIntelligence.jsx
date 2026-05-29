import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Download,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MainPanel, PageHeader } from '../components/layout';
import { formatNgn } from '../Data/mockData';
import { useHelpChat } from '../context/HelpChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';

const PERIOD_OPTIONS = [
  { key: 'month', label: 'This month', shortLabel: 'Month' },
  { key: '4months', label: 'Last 4 months', shortLabel: '4 mo' },
  { key: 'half', label: 'Last 6 months', shortLabel: 'Half yr' },
  { key: 'year', label: 'Last 12 months', shortLabel: 'Year' },
];

function severityTone(sev) {
  if (sev === 'high') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (sev === 'medium') return 'border-amber-200 bg-amber-50 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function riskTone(risk) {
  if (risk === 'critical') return 'text-rose-700 bg-rose-50 ring-rose-100';
  if (risk === 'watch') return 'text-amber-800 bg-amber-50 ring-amber-100';
  return 'text-emerald-800 bg-emerald-50 ring-emerald-100';
}

function stressTone(stress) {
  if (stress === 'deficit') return 'text-rose-700';
  if (stress === 'tight') return 'text-amber-700';
  return 'text-emerald-700';
}

function KpiTile({ label, value, sub, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tabular-nums text-[#134e4a]">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function MixBar({ label, pct, amount, colorClass }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {pct}% · {formatNgn(amount)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function InventoryFamilyCard({ fam }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#134e4a]">{fam.label}</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{fam.productID}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase ring-1 ${riskTone(fam.risk)}`}>
          {fam.risk === 'critical' ? 'Low cover' : fam.risk === 'watch' ? 'Watch' : 'OK'}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Kg on hand</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.kgOnHand.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Weeks cover</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.weeksCover ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Consumed (period)</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.kgConsumedPeriod.toLocaleString()} kg</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Incoming PO</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.incomingKg.toLocaleString()} kg</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] font-bold uppercase text-slate-500">Valuation (coil cost)</dt>
          <dd className="font-black tabular-nums text-[#134e4a]">{formatNgn(fam.valuationNgn || 0)}</dd>
        </div>
      </dl>
      {fam.topGaugeColour?.length ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Top gauge · colour</p>
          <ul className="space-y-1 text-[11px] text-slate-700">
            {fam.topGaugeColour.slice(0, 4).map((b) => (
              <li key={`${b.gauge}-${b.colour}`} className="flex justify-between gap-2">
                <span className="truncate">
                  {b.gauge} · {b.colour}
                </span>
                <span className="tabular-nums shrink-0 font-semibold">{Math.round(b.kg).toLocaleString()} kg</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MaterialPerformancePanel({ perf }) {
  if (!perf?.topCombinations?.length) {
    return <p className="text-sm text-slate-500">No produced sales for this metal in the period.</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Best gauge · colour · profile</p>
        <ul className="space-y-2 text-[11px]">
          {perf.topCombinations.slice(0, 5).map((row) => (
            <li key={`${row.gauge}-${row.colour}-${row.profile}`} className="flex justify-between gap-2">
              <span className="truncate text-slate-800">
                {row.gauge} · {row.colour} · {row.profile}
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums text-[#134e4a]">{formatNgn(row.revenueNgn)}</span>
                {row.marginPct != null ? (
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    margin {row.marginPct}% · {formatNgn(row.marginNgn ?? 0)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Top gauges</p>
          <ul className="text-[11px] text-slate-700 space-y-1">
            {(perf.topGauges || []).slice(0, 3).map((g) => (
              <li key={g.label} className="flex justify-between">
                <span>{g.label}</span>
                <span className="font-semibold tabular-nums">{g.metres} m</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Top colours</p>
          <ul className="text-[11px] text-slate-700 space-y-1">
            {(perf.topColours || []).slice(0, 3).map((c) => (
              <li key={c.label} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-semibold tabular-nums">{formatNgn(c.revenueNgn)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SkuActionList({ title, rows, tone }) {
  if (!rows?.length) return null;
  const toneClass =
    tone === 'buy'
      ? 'border-emerald-200 bg-emerald-50/50'
      : tone === 'liquidate'
        ? 'border-amber-200 bg-amber-50/50'
        : 'border-slate-200 bg-slate-50/50';
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-2">{title}</p>
      <ul className="space-y-2 text-[11px]">
        {rows.map((row) => (
          <li key={`${row.gauge}-${row.colour}`}>
            <div className="flex justify-between gap-2 font-bold text-slate-800">
              <span>
                {row.gauge} · {row.colour}
              </span>
              <span className="tabular-nums shrink-0">{row.kgOnHand.toLocaleString()} kg</span>
            </div>
            <p className="text-slate-600 mt-0.5">{row.reason}</p>
            {row.valuationNgn > 0 ? (
              <p className="text-[10px] text-slate-500 tabular-nums">{formatNgn(row.valuationNgn)} on hand</p>
            ) : null}
            {row.suggestedOrderKg > 0 ? (
              <p className="text-[10px] font-bold text-emerald-800 tabular-nums">
                Suggested order: {row.suggestedOrderKg.toLocaleString()} kg
                {row.projectedStockoutISO ? ` · stockout ~${row.projectedStockoutISO}` : ''}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BusinessIntelligence() {
  const ws = useWorkspace();
  const { openZare } = useHelpChat() || {};
  const [periodKey, setPeriodKey] = useState('month');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [err, setErr] = useState('');

  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
  const mayView = userMayViewManagementReportsClient(roleKey, permissions);

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const { ok, status, data: d } = await apiFetch(
        `/api/analytics/business-intelligence?period=${encodeURIComponent(periodKey)}`
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setData(null);
        if (status === 404 || d?.code === 'NON_JSON_RESPONSE') {
          setErr(
            d?.error ||
              'Business intelligence API not found. Redeploy and restart the backend (commit with /api/analytics/business-intelligence), then refresh.'
          );
          return;
        }
        if (status === 403) {
          setErr(d?.error || 'You do not have permission to view management reports.');
          return;
        }
        if (status === 401) {
          setErr('Session expired. Sign in again and retry.');
          return;
        }
        if (status === 502 || status === 503) {
          setErr('API server is unreachable. Confirm the backend is running and VITE_API_BASE points to it.');
          return;
        }
        const apiErr = String(d?.error || '');
        if (/asOfISO is not defined/i.test(apiErr)) {
          setErr(
            `${apiErr} — Your API is still on an old backend build. On the server: git pull origin main, then restart Node. Open /api/health and confirm capabilities.businessIntelligence is "bi-v4".`
          );
          return;
        }
        setErr(
          d?.error ||
            (status ? `Could not load business intelligence (HTTP ${status}).` : 'Could not load business intelligence.')
        );
        return;
      }
      setData(d);
    } catch (e) {
      setBusy(false);
      setData(null);
      setErr(String(e?.message || e) || 'Network error while loading business intelligence.');
    }
  }, [periodKey]);

  useEffect(() => {
    if (mayView) void load();
  }, [load, mayView]);

  const downloadExcel = useCallback(async () => {
    setExportBusy(true);
    try {
      const path = `/api/analytics/business-intelligence/export?period=${encodeURIComponent(periodKey)}`;
      const r = await fetch(apiUrl(path), { credentials: 'include' });
      if (!r.ok) {
        let msg = 'Export failed.';
        try {
          const j = await r.json();
          msg = j.error || msg;
        } catch {
          msg = (await r.text()).slice(0, 200) || msg;
        }
        setErr(msg);
        return;
      }
      const blob = await r.blob();
      const filename =
        r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
        `zarewa-business-intelligence-${periodKey}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(String(e?.message || e) || 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  }, [periodKey]);

  if (!mayView) {
    return <Navigate to="/" replace />;
  }

  const sales = data?.sales;
  const inv = data?.inventory;
  const pred = data?.predictive;
  const aluMix = sales?.mixRows?.find((r) => r.family === 'aluminium');
  const azMix = sales?.mixRows?.find((r) => r.family === 'aluzinc');
  const matPerf = sales?.materialPerformance;
  const sku = inv?.skuIntelligence;
  const skuForecast = invForecast;
  const procurement = data?.procurement;
  const branches = data?.branchBreakdown?.byBranch || [];
  const prodForecast = data?.productionForecast;
  const invForecast = data?.inventoryForecast;
  const expenses = data?.expenseAnalysis;

  return (
    <MainPanel>
      <PageHeader
        title="Business intelligence"
        subtitle="Production & inventory forecasts, expense analysis, material winners, and cash outlook."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Analysis period">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodKey(p.key)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border transition-colors ${
                    periodKey === p.key
                      ? 'bg-[#134e4a] text-white border-[#134e4a]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200'
                  }`}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase text-[#134e4a] disabled:opacity-50"
            >
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void downloadExcel()}
              disabled={exportBusy || busy || !data}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase text-[#134e4a] disabled:opacity-50"
            >
              <Download size={14} className={exportBusy ? 'animate-pulse' : ''} />
              Excel
            </button>
            {openZare ? (
              <button
                type="button"
                onClick={() =>
                  openZare({
                    prompt: 'Analyze my business — sales, aluminium and aluzinc inventory, and cash flow outlook.',
                    autoSend: true,
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-[11px] font-black uppercase text-[#134e4a]"
              >
                <Sparkles size={14} />
                Ask Zare
              </button>
            ) : null}
          </div>
        }
      />

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      {data ? (
        <div className="space-y-6 min-w-0">
          {pred?.alerts?.length ? (
            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                <AlertTriangle size={14} />
                Priority signals
              </h2>
              <ul className="mt-3 space-y-2">
                {pred.alerts.map((a) => (
                  <li
                    key={a.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${severityTone(a.severity)}`}
                  >
                    <span className="font-black uppercase text-[9px] mr-2">{a.category}</span>
                    {a.message}
                    {a.metric ? <span className="ml-1 font-bold tabular-nums">({a.metric})</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Produced sales"
              value={formatNgn(sales?.producedRevenueNgn || 0)}
              sub={data.periodLabel}
              icon={<BarChart3 size={12} className="text-teal-600" />}
            />
            <KpiTile
              label="30d production forecast"
              value={formatNgn(
                prodForecast?.horizons?.find((h) => h.days === 30)?.projectedProducedRevenueNgn || 0
              )}
              sub={
                prodForecast?.growthRatePct != null
                  ? `Trend ${prodForecast.growthRatePct >= 0 ? '+' : ''}${prodForecast.growthRatePct}% vs prior quarter`
                  : 'Based on 6-month run-rate'
              }
              icon={<TrendingUp size={12} className="text-teal-600" />}
            />
            <KpiTile
              label="Expenses (period)"
              value={formatNgn(expenses?.periodTotalNgn || 0)}
              sub={
                expenses?.expenseToProducedSalesPct != null
                  ? `${expenses.expenseToProducedSalesPct}% of produced sales`
                  : expenses?.periodChangePct != null
                    ? `${expenses.periodChangePct >= 0 ? '+' : ''}${expenses.periodChangePct}% vs prior period`
                    : 'Operating expenses'
              }
              icon={<Wallet size={12} className="text-amber-600" />}
            />
            <KpiTile
              label="Coil stockout risk"
              value={
                invForecast?.familyForecasts?.find((f) => f.horizons?.[0]?.stockoutRisk)?.label?.slice(0, 12) ||
                'OK'
              }
              sub={
                invForecast?.familyForecasts
                  ?.map((f) => (f.stockoutDays != null ? `${f.label}: ~${f.stockoutDays}d` : null))
                  .filter(Boolean)
                  .join(' · ') || 'Cover from consumption rate'
              }
              icon={<Layers size={12} className="text-amber-600" />}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-teal-200/80 bg-teal-50/30 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">
                Production forecast
              </h2>
              <p className="text-[11px] text-slate-600 mt-1 mb-4">Produced sales & metres (run-rate + trend)</p>
              <ul className="space-y-2 text-[11px]">
                {(prodForecast?.horizons || []).map((h) => (
                  <li key={h.days} className="rounded-lg bg-white/80 border border-white px-3 py-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{h.days}-day</span>
                      <span className="tabular-nums text-[#134e4a]">{formatNgn(h.projectedProducedRevenueNgn)}</span>
                    </div>
                    <p className="text-slate-600 tabular-nums">{h.projectedMetres.toLocaleString()} m projected</p>
                  </li>
                ))}
              </ul>
              {prodForecast?.pipeline?.openQuotedNgn > 0 ? (
                <p className="mt-3 text-[10px] text-slate-600 border-t border-teal-100 pt-3">
                  Pipeline: {formatNgn(prodForecast.pipeline.openQuotedNgn)} quoted not yet produced → ~
                  {formatNgn(prodForecast.pipeline.forecastProducedRevenueNgn)} at{' '}
                  {prodForecast.pipeline.assumedConversionPct}% conversion
                </p>
              ) : null}
              {prodForecast?.funnelConversion?.quoteToProductionPct != null ? (
                <p className="mt-2 text-[10px] text-slate-500">
                  Funnel: {prodForecast.funnelConversion.quoteToProductionPct}% quotes reach production ·{' '}
                  {prodForecast.funnelConversion.quoteToPaymentPct}% with payment
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-violet-200/80 bg-violet-50/25 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">
                Inventory forecast
              </h2>
              <p className="text-[11px] text-slate-600 mt-1 mb-4">Consumption burn & stockout timing by metal</p>
              <div className="space-y-3">
                {(invForecast?.familyForecasts || []).map((fam) => (
                  <div key={fam.family} className="rounded-lg bg-white/80 border border-white px-3 py-2 text-[11px]">
                    <p className="font-bold text-slate-800">{fam.label}</p>
                    <p className="text-slate-600 tabular-nums">
                      {fam.kgOnHand.toLocaleString()} kg on hand · {fam.dailyConsumptionKg} kg/day ·{' '}
                      {fam.incomingKg.toLocaleString()} kg incoming
                    </p>
                    {fam.suggestedOrderKg > 0 ? (
                      <p className="text-emerald-800 font-semibold mt-1">
                        Suggested order ~{fam.suggestedOrderKg.toLocaleString()} kg (4-week target)
                      </p>
                    ) : null}
                    {fam.projectedStockoutISO ? (
                      <p className="text-amber-800 mt-0.5">Stockout ~{fam.projectedStockoutISO} if no reorder</p>
                    ) : null}
                    <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
                      {(fam.horizons || []).map((h) => (
                        <li key={h.days}>
                          {h.days}d: burn {h.projectedConsumptionKg.toLocaleString()} kg →{' '}
                          {h.stockoutRisk ? (
                            <span className="text-rose-700 font-bold">shortfall</span>
                          ) : (
                            <span>{h.projectedKgOnHand.toLocaleString()} kg left</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">Expense analysis</h2>
              <p className="text-[11px] text-slate-600 mt-1 mb-4">{data.periodLabel} operating spend</p>
              <dl className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">Total</dt>
                  <dd className="font-black tabular-nums">{formatNgn(expenses?.periodTotalNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">Avg / month</dt>
                  <dd className="font-black tabular-nums">{formatNgn(expenses?.avgMonthlyExpenseNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">Next 30d est.</dt>
                  <dd className="font-black tabular-nums">{formatNgn(expenses?.projectedNext30DaysNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">vs prior period</dt>
                  <dd className="font-black tabular-nums">
                    {expenses?.periodChangePct != null
                      ? `${expenses.periodChangePct >= 0 ? '+' : ''}${expenses.periodChangePct}%`
                      : '—'}
                  </dd>
                </div>
              </dl>
              {(expenses?.topCategories || []).length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Top categories</p>
                  <ul className="space-y-1 text-[11px] max-h-36 overflow-y-auto">
                    {expenses.topCategories.slice(0, 8).map((c) => (
                      <li key={c.category} className="flex justify-between gap-2">
                        <span className="truncate text-slate-700">{c.category}</span>
                        <span className="shrink-0 font-bold tabular-nums">
                          {c.sharePct}% · {formatNgn(c.amountNgn)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No expenses recorded in this period.</p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] flex items-center gap-2">
                <BarChart3 size={14} />
                Sales mix — aluminium vs aluzinc
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Produced revenue share by metal family</p>
              <div className="space-y-4">
                <MixBar
                  label="Aluminium"
                  pct={aluMix?.sharePct || 0}
                  amount={aluMix?.revenueNgn || 0}
                  colorClass="bg-sky-600"
                />
                <MixBar
                  label="Aluzinc (PPGI)"
                  pct={azMix?.sharePct || 0}
                  amount={azMix?.revenueNgn || 0}
                  colorClass="bg-[#134e4a]"
                />
                {(sales?.mixRows || [])
                  .filter((r) => r.family === 'other' && r.revenueNgn > 0)
                  .map((r) => (
                    <MixBar
                      key={r.family}
                      label="Other"
                      pct={r.sharePct}
                      amount={r.revenueNgn}
                      colorClass="bg-slate-400"
                    />
                  ))}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">Quoted (period)</dt>
                  <dd className="font-black tabular-nums">{formatNgn(sales?.quotedNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-[10px]">Sales momentum</dt>
                  <dd className={`font-black tabular-nums flex items-center gap-1 ${pred?.salesMomentumPct != null && pred.salesMomentumPct < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {pred?.salesMomentumPct != null ? (
                      <>
                        {pred.salesMomentumPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {pred.salesMomentumPct >= 0 ? '+' : ''}
                        {pred.salesMomentumPct}%
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] flex items-center gap-2">
                <Layers size={14} />
                Quote-to-production funnel
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  ['Quotations', sales?.funnel?.quotations],
                  ['Approved / paid path', sales?.funnel?.approved],
                  ['With payment', sales?.funnel?.withPayment],
                  ['Cutting lists', sales?.funnel?.cuttingLists],
                  ['Production completed', sales?.funnel?.productionCompleted],
                ].map(([label, val]) => (
                  <li key={label} className="flex justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-black tabular-nums text-slate-900">{val ?? 0}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">
                Material performance — aluminium
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Produced sales by gauge, colour & profile</p>
              <MaterialPerformancePanel perf={matPerf?.aluminium} />
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">
                Material performance — aluzinc
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Produced sales by gauge, colour & profile</p>
              <MaterialPerformancePanel perf={matPerf?.aluzinc} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] mb-3 flex items-center gap-2">
              <Layers size={14} />
              Coil inventory intelligence
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(inv?.families || []).map((fam) => (
                <InventoryFamilyCard key={fam.family} fam={fam} />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Total coil kg tracked: {(inv?.totalCoilKg || 0).toLocaleString()} · Alu{' '}
              {inv?.aluminiumSharePct ?? 0}% / Aluzinc {inv?.aluzincSharePct ?? 0}% of stock
            </p>
          </section>

          {sku || skuForecast ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] mb-1">
                Coil SKU actions — buy, watch & liquidate
              </h2>
              <p className="text-[11px] text-slate-500 mb-4">
                Gauge × colour combinations with suggested order kg and stockout dates
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-sky-800 mb-2">Aluminium</p>
                  <div className="space-y-3">
                    <SkuActionList
                      title="Buy next"
                      rows={skuForecast?.aluminium?.buyNext || sku?.aluminium?.buyNext}
                      tone="buy"
                    />
                    <SkuActionList
                      title="Reduce / free cash"
                      rows={skuForecast?.aluminium?.reduceStock || sku?.aluminium?.reduceStock}
                      tone="liquidate"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[#134e4a] mb-2">Aluzinc</p>
                  <div className="space-y-3">
                    <SkuActionList
                      title="Buy next"
                      rows={skuForecast?.aluzinc?.buyNext || sku?.aluzinc?.buyNext}
                      tone="buy"
                    />
                    <SkuActionList
                      title="Reduce / free cash"
                      rows={skuForecast?.aluzinc?.reduceStock || sku?.aluzinc?.reduceStock}
                      tone="liquidate"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {branches.length > 1 ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm overflow-x-auto">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] mb-1">
                Branch scorecards
              </h2>
              <p className="text-[11px] text-slate-500 mb-4">
                Produced sales, net collections, coil stock, and SKU signals per branch
              </p>
              <table className="w-full text-left text-[11px] min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px]">
                    <th className="py-2 pr-3 font-bold">Branch</th>
                    <th className="py-2 pr-3 font-bold text-right">Produced</th>
                    <th className="py-2 pr-3 font-bold text-right">Net paid</th>
                    <th className="py-2 pr-3 font-bold text-right">Coil kg</th>
                    <th className="py-2 pr-3 font-bold">Top material</th>
                    <th className="py-2 font-bold text-right">Buy / Liq</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.branchId} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-bold text-slate-800">{b.branchId}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNgn(b.producedRevenueNgn)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatNgn(b.netCollectedNgn)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{b.coilKgOnHand.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-slate-700 max-w-[200px] truncate">{b.topMaterialLabel}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">
                        {b.buySkuCount} / {b.liquidateSkuCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {procurement?.supplierFocus?.length ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] mb-4">
                Supplier focus (4-month PO activity)
              </h2>
              <ul className="space-y-3">
                {procurement.supplierFocus.slice(0, 6).map((s) => (
                  <li key={s.supplierID} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold text-slate-800">{s.supplierName}</span>
                    <span className="text-[11px] text-slate-600 tabular-nums">
                      Spend {formatNgn(s.spendNgn)} · Open {formatNgn(s.openNgn)} ·{' '}
                      {s.coilKgOrdered.toLocaleString()} kg coil on order
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-teal-200/80 bg-teal-50/30 p-5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">Cash forecast</h2>
              <p className="text-[11px] text-slate-600 mt-1">
                Based on 4-month average treasury flows + pending outflows
              </p>
              <ul className="mt-4 space-y-3">
                {(pred?.cashHorizons || []).map((h) => (
                  <li key={h.days} className="rounded-xl bg-white/80 border border-white px-3 py-2.5 text-sm">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{h.days}-day horizon</span>
                      <span className={`tabular-nums ${stressTone(h.stress)}`}>{h.stress}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 tabular-nums">
                      Projected balance {formatNgn(h.projectedBalanceNgn)} · net{' '}
                      {formatNgn(h.projectedNetNgn)}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500 uppercase text-[10px] font-bold">Avg inflow / mo</dt>
                  <dd className="font-black tabular-nums">{formatNgn(pred?.avgMonthlyInflowNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 uppercase text-[10px] font-bold">Avg outflow / mo</dt>
                  <dd className="font-black tabular-nums">{formatNgn(pred?.avgMonthlyOutflowNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 uppercase text-[10px] font-bold">Est. gross margin</dt>
                  <dd className="font-black tabular-nums">
                    {pred?.grossMarginPct != null ? `${pred.grossMarginPct}%` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 uppercase text-[10px] font-bold">Pending outflows</dt>
                  <dd className="font-black tabular-nums">{formatNgn(pred?.pendingOutflowsNgn || 0)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a]">
                Revenue trend (6 months)
              </h2>
              <ul className="mt-4 space-y-2">
                {(sales?.revenueTrend || []).map((row) => {
                  const max = Math.max(...(sales.revenueTrend || []).map((r) => r.producedSalesNgn), 1);
                  return (
                    <li key={row.key}>
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{row.key}</span>
                        <span className="tabular-nums text-[#134e4a]">{formatNgn(row.producedSalesNgn)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#134e4a] rounded-full"
                          style={{ width: `${(row.producedSalesNgn / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mt-6 mb-2">
                Receivables aging
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['0–30 days', sales?.receivablesAging?.['0_30']],
                  ['31–60 days', sales?.receivablesAging?.['31_60']],
                  ['61–90 days', sales?.receivablesAging?.['61_90']],
                  ['90+ days', sales?.receivablesAging?.over_90],
                ].map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-black tabular-nums">{formatNgn(val || 0)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#134e4a] mb-1">
              Top customers ({data.periodLabel?.toLowerCase()})
            </h2>
            <p className="text-[11px] text-slate-500 mb-4">Ranked by net payments (receipts minus refunds)</p>
            {(sales?.topCustomers || []).length === 0 ? (
              <p className="text-sm text-slate-500">No customer payments in this period yet.</p>
            ) : (
              <ul className="space-y-3">
                {sales.topCustomers.slice(0, 8).map((c, idx) => (
                  <li key={c.customerID || idx} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm font-bold gap-2">
                        <span className="truncate">{c.customerName}</span>
                        <span className="tabular-nums text-[#134e4a] shrink-0">
                          {formatNgn(c.netCollectedNgn ?? c.revenueNgn ?? 0)}
                        </span>
                      </div>
                      {c.paymentsNgn != null ? (
                        <p className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                          Paid {formatNgn(c.paymentsNgn)}
                          {c.refundsNgn > 0 ? ` · Refunds −${formatNgn(c.refundsNgn)}` : ''}
                          {c.receiptCount ? ` · ${c.receiptCount} receipt(s)` : ''}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[10px] text-slate-400">
            Generated {data.generatedAtISO ? new Date(data.generatedAtISO).toLocaleString() : '—'} · Branch scope{' '}
            {data.branchScope}
          </p>
        </div>
      ) : !err && busy ? (
        <p className="text-sm text-slate-500">Loading analytics…</p>
      ) : null}
    </MainPanel>
  );
}
