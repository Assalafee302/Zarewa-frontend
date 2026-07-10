import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useHelpChat } from '../../context/HelpChatContext';
import { apiFetch, apiUrl } from '../../lib/apiBase';

const PERIOD_OPTIONS = [
  { key: 'month', label: 'This month', shortLabel: 'Month' },
  { key: '4months', label: 'Last 4 months', shortLabel: '4 mo' },
  { key: 'half', label: 'Last 6 months', shortLabel: 'Half yr' },
  { key: 'year', label: 'Last 12 months', shortLabel: 'Year' },
];

function riskTone(risk) {
  if (risk === 'critical') return 'text-rose-700 bg-rose-50 ring-rose-100';
  if (risk === 'watch') return 'text-amber-800 bg-amber-50 ring-amber-100';
  return 'text-emerald-800 bg-emerald-50 ring-emerald-100';
}

function MixBar({ label, pct, amount, metres, colorClass, primary = 'metres' }) {
  const sub =
    primary === 'metres'
      ? `${pct}% · ${(metres ?? 0).toLocaleString()} m`
      : `${pct}% · ${formatNgn(amount)}`;
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{sub}</span>
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
          <h3 className="text-sm font-black uppercase tracking-wider text-zarewa-teal">{fam.label}</h3>
          <p className="text-ui-xs text-slate-500 font-mono mt-0.5">{fam.productID}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-ui-xs font-black uppercase ring-1 ${riskTone(fam.risk)}`}>
          {fam.risk === 'critical' ? 'Low cover' : fam.risk === 'watch' ? 'Watch' : 'OK'}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-500">Kg on hand</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.kgOnHand.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-500">Weeks cover</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.weeksCover ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-500">Consumed (period)</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.kgConsumedPeriod.toLocaleString()} kg</dd>
        </div>
        <div>
          <dt className="text-ui-xs font-bold uppercase text-slate-500">Incoming PO</dt>
          <dd className="font-black tabular-nums text-slate-900">{fam.incomingKg.toLocaleString()} kg</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ui-xs font-bold uppercase text-slate-500">Valuation (coil cost)</dt>
          <dd className="font-black tabular-nums text-zarewa-teal">{formatNgn(fam.valuationNgn || 0)}</dd>
        </div>
      </dl>
      {fam.topGaugeColour?.length ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-ui-xs font-bold uppercase text-slate-500 mb-2">Top gauge · colour</p>
          <ul className="space-y-1 text-xs text-slate-700">
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
        <p className="text-ui-xs font-bold uppercase text-slate-500 mb-2">
          Best gauge · colour · profile (by metres produced)
        </p>
        <ul className="space-y-2 text-xs">
          {perf.topCombinations.slice(0, 5).map((row) => (
            <li key={`${row.gauge}-${row.colour}-${row.profile}`} className="flex justify-between gap-2">
              <span className="truncate text-slate-800">
                {row.gauge} · {row.colour} · {row.profile}
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums text-zarewa-teal">
                  {row.metres.toLocaleString()} m
                  {row.sharePctMetres != null ? ` (${row.sharePctMetres}%)` : ''}
                </span>
                <span className="text-ui-xs text-slate-500 tabular-nums">
                  {formatNgn(row.revenueNgn)} produced sales
                  {row.marginPct != null ? ` · margin ${row.marginPct}%` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-ui-xs font-bold uppercase text-slate-500 mb-1">Top gauges</p>
          <ul className="text-xs text-slate-700 space-y-1">
            {(perf.topGauges || []).slice(0, 3).map((g) => (
              <li key={g.label} className="flex justify-between">
                <span>{g.label}</span>
                <span className="font-semibold tabular-nums">{g.metres} m</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-ui-xs font-bold uppercase text-slate-500 mb-1">Top colours</p>
          <ul className="text-xs text-slate-700 space-y-1">
            {(perf.topColours || []).slice(0, 3).map((c) => (
              <li key={c.label} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-semibold tabular-nums">{c.metres.toLocaleString()} m</span>
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
      <p className="text-ui-xs font-black uppercase tracking-wider text-slate-600 mb-2">{title}</p>
      <ul className="space-y-2 text-xs">
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
              <p className="text-ui-xs text-slate-500 tabular-nums">{formatNgn(row.valuationNgn)} on hand</p>
            ) : null}
            {row.suggestedOrderKg > 0 ? (
              <p className="text-ui-xs font-bold text-emerald-800 tabular-nums">
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

/**
 * Long-horizon BI panels — forecasts, material mix, coil SKU actions, export.
 * Used inside Command Centre (Intelligence tab) and standalone /analytics fallback.
 */
export default function CommandCentreIntelligenceTab({ autoLoad = true, branchId = null }) {
  const { openZare } = useHelpChat() || {};
  const [periodKey, setPeriodKey] = useState('month');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(autoLoad);
  const [exportBusy, setExportBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const qs = new URLSearchParams({ period: periodKey });
      if (branchId) qs.set('branchId', branchId);
      const { ok, status, data: d } = await apiFetch(
        `/api/analytics/business-intelligence?${qs.toString()}`
      );
      setBusy(false);
      if (!ok || !d?.ok) {
        setData(null);
        if (status === 403) {
          setErr(d?.error || 'You do not have permission to view management reports.');
          return;
        }
        setErr(d?.error || (status ? `Could not load intelligence (HTTP ${status}).` : 'Could not load intelligence.'));
        return;
      }
      setData(d);
    } catch (e) {
      setBusy(false);
      setData(null);
      setErr(String(e?.message || e) || 'Network error while loading intelligence.');
    }
  }, [periodKey, branchId]);

  useEffect(() => {
    if (autoLoad) void load();
  }, [load, autoLoad]);

  const downloadExcel = useCallback(async () => {
    setExportBusy(true);
    try {
      const qs = new URLSearchParams({ period: periodKey });
      if (branchId) qs.set('branchId', branchId);
      const path = `/api/analytics/business-intelligence/export?${qs.toString()}`;
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
  }, [periodKey, branchId]);

  const sales = data?.sales;
  const inv = data?.inventory;
  const pred = data?.predictive;
  const aluMix = sales?.mixRows?.find((r) => r.family === 'aluminium');
  const azMix = sales?.mixRows?.find((r) => r.family === 'aluzinc');
  const matPerf = sales?.materialPerformance;
  const sku = inv?.skuIntelligence;
  const procurement = data?.procurement;
  const prodForecast = data?.productionForecast;
  const invForecast = data?.inventoryForecast;
  const skuForecast = invForecast;
  const expenses = data?.expenseAnalysis;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600 max-w-xl">
          Forecasts, material winners, and coil actions. Use Overview for alerts and approvals.
          {branchId ? (
            <span className="block mt-1 font-semibold text-zarewa-teal">
              Branch scope: {branchId === 'ALL' ? 'All branches' : branchId}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Analysis period">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodKey(p.key)}
                className={`px-2.5 py-1 rounded-lg text-ui-xs font-black uppercase tracking-wide border transition-colors ${
                  periodKey === p.key
                    ? 'bg-zarewa-teal text-white border-zarewa-teal'
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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-zarewa-teal disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void downloadExcel()}
            disabled={exportBusy || busy || !data}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-zarewa-teal disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black uppercase text-zarewa-teal"
            >
              <Sparkles size={14} />
              Ask Zare
            </button>
          ) : null}
        </div>
      </div>

      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-teal-200/80 bg-teal-50/30 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">Production forecast</h2>
              <p className="text-xs text-slate-600 mt-1 mb-4">Produced sales & metres (run-rate + trend)</p>
              <ul className="space-y-2 text-xs">
                {(prodForecast?.horizons || []).map((h) => (
                  <li key={h.days} className="rounded-lg bg-white/80 border border-white px-3 py-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{h.days}-day</span>
                      <span className="tabular-nums text-zarewa-teal">{formatNgn(h.projectedProducedRevenueNgn)}</span>
                    </div>
                    <p className="text-slate-600 tabular-nums">{h.projectedMetres.toLocaleString()} m projected</p>
                  </li>
                ))}
              </ul>
              {prodForecast?.pipeline?.openQuotedNgn > 0 ? (
                <p className="mt-3 text-ui-xs text-slate-600 border-t border-teal-100 pt-3">
                  Pipeline: {formatNgn(prodForecast.pipeline.openQuotedNgn)} quoted not yet produced → ~
                  {formatNgn(prodForecast.pipeline.forecastProducedRevenueNgn)} at{' '}
                  {prodForecast.pipeline.assumedConversionPct}% conversion
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-violet-200/80 bg-violet-50/25 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">Inventory forecast</h2>
              <p className="text-xs text-slate-600 mt-1 mb-4">Consumption burn & stockout timing by metal</p>
              <div className="space-y-3">
                {(invForecast?.familyForecasts || []).map((fam) => (
                  <div key={fam.family} className="rounded-lg bg-white/80 border border-white px-3 py-2 text-xs">
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
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm lg:col-span-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">Expense analysis</h2>
              <p className="text-xs text-slate-600 mt-1 mb-4">{data.periodLabel} operating spend</p>
              <dl className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-ui-xs">Total</dt>
                  <dd className="font-black tabular-nums">{formatNgn(expenses?.periodTotalNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-ui-xs">Next 30d est.</dt>
                  <dd className="font-black tabular-nums">{formatNgn(expenses?.projectedNext30DaysNgn || 0)}</dd>
                </div>
              </dl>
              {(expenses?.topCategories || []).length > 0 ? (
                <ul className="space-y-1 text-xs max-h-36 overflow-y-auto">
                  {expenses.topCategories.slice(0, 8).map((c) => (
                    <li key={c.category} className="flex justify-between gap-2">
                      <span className="truncate text-slate-700">{c.category}</span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {c.sharePct}% · {formatNgn(c.amountNgn)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No expenses in this period.</p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal flex items-center gap-2">
                <BarChart3 size={14} />
                Sales mix — aluminium vs aluzinc
              </h2>
              <div className="space-y-4 mt-4">
                <MixBar
                  label="Aluminium"
                  pct={aluMix?.sharePctMetres || 0}
                  metres={aluMix?.metres || 0}
                  amount={aluMix?.revenueNgn || 0}
                  colorClass="bg-sky-600"
                />
                <MixBar
                  label="Aluzinc (PPGI)"
                  pct={azMix?.sharePctMetres || 0}
                  metres={azMix?.metres || 0}
                  amount={azMix?.revenueNgn || 0}
                  colorClass="bg-zarewa-teal"
                />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-ui-xs">Quoted (period)</dt>
                  <dd className="font-black tabular-nums">{formatNgn(sales?.quotedNgn || 0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-bold uppercase text-ui-xs">Sales momentum</dt>
                  <dd
                    className={`font-black tabular-nums flex items-center gap-1 ${pred?.salesMomentumPct != null && pred.salesMomentumPct < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                  >
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
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal flex items-center gap-2">
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
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">
                Material performance — aluminium
              </h2>
              <MaterialPerformancePanel perf={matPerf?.aluminium} />
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">
                Material performance — aluzinc
              </h2>
              <MaterialPerformancePanel perf={matPerf?.aluzinc} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal mb-3 flex items-center gap-2">
              <Layers size={14} />
              Coil inventory intelligence
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(inv?.families || []).map((fam) => (
                <InventoryFamilyCard key={fam.family} fam={fam} />
              ))}
            </div>
          </section>

          {sku || skuForecast ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal mb-4">
                Coil SKU actions — buy, watch & liquidate
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-ui-xs font-black uppercase text-sky-800">Aluminium</p>
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
                <div className="space-y-3">
                  <p className="text-ui-xs font-black uppercase text-zarewa-teal">Aluzinc</p>
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
            </section>
          ) : null}

          {procurement?.supplierFocus?.length ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal mb-4">
                Supplier focus (4-month PO activity)
              </h2>
              <ul className="space-y-3">
                {procurement.supplierFocus.slice(0, 6).map((s) => (
                  <li key={s.supplierID} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold text-slate-800">{s.supplierName}</span>
                    <span className="text-xs text-slate-600 tabular-nums">
                      Spend {formatNgn(s.spendNgn)} · Open {formatNgn(s.openNgn)} ·{' '}
                      {s.coilKgOrdered.toLocaleString()} kg coil on order
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-wider text-zarewa-teal">Revenue trend (6 months)</h2>
            <ul className="mt-4 space-y-2">
              {(sales?.revenueTrend || []).map((row) => {
                const max = Math.max(...(sales.revenueTrend || []).map((r) => r.producedSalesNgn), 1);
                return (
                  <li key={row.key}>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>{row.key}</span>
                      <span className="tabular-nums text-zarewa-teal">{formatNgn(row.producedSalesNgn)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-zarewa-teal rounded-full"
                        style={{ width: `${(row.producedSalesNgn / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="text-ui-xs text-slate-400">
            Generated {data.generatedAtISO ? new Date(data.generatedAtISO).toLocaleString() : '—'} ·{' '}
            {data.periodLabel}
          </p>
        </>
      ) : !err && busy ? (
        <p className="text-sm text-slate-500">Loading intelligence…</p>
      ) : null}
    </div>
  );
}
