import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { FinanceSequencePanel } from '../layout';
import {
  ManagerFulfillmentPipelinePanel,
  ManagerReceivablesPanel,
} from './ManagerDeskExtras.jsx';
import { momSpikeSignals, singleMetricMomDelta } from '../../lib/momSpikeSignals.js';

function PanelShell({ title, subtitle, children, disclaimer }) {
  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 sm:p-5 bg-white">
      <div className="mb-3">
        <h3 className="text-sm font-black text-zarewa-teal tracking-tight">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        {disclaimer ? (
          <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-ui-xs text-amber-900">
            {disclaimer}
          </p>
        ) : null}
      </div>
      {children}
    </FinanceSequencePanel>
  );
}

function EmptyNote({ text }) {
  return <p className="text-xs text-slate-500 py-6 text-center">{text}</p>;
}

/**
 * Business Intelligence tab — real pulses only (no fabricated company avg / trends).
 */
export function ManagerIntelligenceTab({
  displaySnapshots,
  branchLabel,
  mayViewReports = false,
  onJumpFilter,
  quotations = [],
  salesAvailable = true,
}) {
  const [salesSummary, setSalesSummary] = useState(null);
  const [production, setProduction] = useState(null);
  const [finance, setFinance] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [salesQ, prodQ, finQ, benchQ] = await Promise.all([
        apiFetch('/api/sales/dashboard/summary').catch(() => ({ ok: false })),
        apiFetch('/api/reports/production-status').catch(() => ({ ok: false })),
        apiFetch('/api/finance/desk-overview').catch(() => ({ ok: false })),
        mayViewReports
          ? apiFetch('/api/management/branch-benchmark?period=month').catch(() => ({ ok: false }))
          : Promise.resolve({ ok: false }),
      ]);
      if (cancelled) return;
      setSalesSummary(salesQ.ok && salesQ.data?.ok !== false ? salesQ.data : null);
      setProduction(prodQ.ok ? prodQ.data : null);
      setFinance(finQ.ok ? finQ.data : null);
      setBenchmark(benchQ.ok && benchQ.data?.ok ? benchQ.data : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mayViewReports]);

  const revenueTrend = useMemo(() => {
    const series = salesSummary?.revenueTrend || salesSummary?.trend || displaySnapshots?.revenueTrend || [];
    if (Array.isArray(series) && series.length) {
      return series.slice(-12).map((p, i) => ({
        name: p.label || p.week || `W${i + 1}`,
        v: Number(p.amount ?? p.value ?? p.revenue ?? 0) || 0,
      }));
    }
    return [];
  }, [displaySnapshots, salesSummary]);

  const productionMix = useMemo(() => {
    const mix = production?.statusMix || production?.byStatus || [];
    if (Array.isArray(mix) && mix.length) {
      return mix.map((r) => ({
        name: r.label || r.status || '—',
        v: Number(r.count ?? r.value ?? 0) || 0,
      }));
    }
    return [
      { name: 'Planned', v: Number(production?.planned) || 0 },
      { name: 'In progress', v: Number(production?.inProgress ?? production?.in_progress) || 0 },
      { name: 'Complete', v: Number(production?.complete ?? production?.completed) || 0 },
    ].filter((r) => r.v > 0);
  }, [production]);

  const metresMom = useMemo(() => {
    const current = Number(displaySnapshots?.completedProductionMetres) || 0;
    const prior = Number(displaySnapshots?.priorCompletedProductionMetres) || 0;
    if (!prior && !current) return [];
    return momSpikeSignals([singleMetricMomDelta('Production metres', current, prior)], {
      absFloor: 1000,
      idPrefix: 'metres',
    });
  }, [displaySnapshots]);

  const scorecard = useMemo(() => {
    const youRevenue =
      Number(benchmark?.you?.producedRevenueNgn) || Number(displaySnapshots?.producedSalesNgn) || 0;
    const youCollected =
      Number(benchmark?.you?.netCollectedNgn) || Number(displaySnapshots?.paidOnQuotesNgn) || 0;
    const companyRevenue = benchmark?.companyAvg?.producedRevenueNgn;
    const companyCollected = benchmark?.companyAvg?.netCollectedNgn;
    return [
      {
        label: 'Produced revenue',
        you: youRevenue,
        company: companyRevenue,
        money: true,
      },
      {
        label: 'Net collected',
        you: youCollected,
        company: companyCollected,
        money: true,
      },
      {
        label: 'Internal score',
        you: benchmark?.you?.internalScore ?? '—',
        company: benchmark?.companyAvg?.internalScore ?? '—',
        money: false,
      },
    ];
  }, [benchmark, displaySnapshots]);

  const cashCleared =
    Number(finance?.cashCleared ?? finance?.liquidity?.cleared ?? displaySnapshots?.paidOnQuotesNgn) || 0;

  const peers = Array.isArray(benchmark?.peers) ? benchmark.peers : [];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Read-only pulse for {branchLabel || 'your branch'} — real actuals only
        {loading ? ' · refreshing…' : ''}.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelShell title="Sales pulse" subtitle="Revenue trend (when series exists)">
          {revenueTrend.length ? (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v) => formatNgn(v)} />
                  <Area type="monotone" dataKey="v" stroke="#134e4a" fill="#134e4a" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote text="Not enough history yet." />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-ui-xs text-slate-500 uppercase font-bold">Produced</p>
              <p className="font-black tabular-nums text-zarewa-teal">
                {formatNgn(displaySnapshots?.producedSalesNgn)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-ui-xs text-slate-500 uppercase font-bold">Quotes</p>
              <p className="font-black tabular-nums text-zarewa-teal">
                {Number(displaySnapshots?.quoteCount) || 0}
              </p>
            </div>
          </div>
        </PanelShell>

        <PanelShell title="Production pulse" subtitle="Status mix & QC gaps">
          {productionMix.length ? (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionMix}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="v" fill="#134e4a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote text="Not enough history yet." />
          )}
          {metresMom.length ? (
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-ui-xs text-amber-950">
              MoM alert: {metresMom[0].title}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal hover:text-zarewa-teal"
              onClick={() => onJumpFilter?.('qc')}
            >
              Open QC queue
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-ui-xs font-bold uppercase text-slate-600 hover:border-zarewa-teal hover:text-zarewa-teal"
              onClick={() => onJumpFilter?.('orders')}
            >
              Production gate
            </button>
          </div>
        </PanelShell>

        <PanelShell
          title="Finance pulse"
          subtitle="Cash position (read-only)"
          disclaimer="Material costs only where P&L is shown — excludes labour & overhead."
        >
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-4">
            <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Cash & bank cleared</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-zarewa-teal">{formatNgn(cashCleared)}</p>
          </div>
        </PanelShell>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ManagerFulfillmentPipelinePanel quotations={quotations} />
        <ManagerReceivablesPanel available={salesAvailable} />
      </div>

      <PanelShell
        title="Branch vs company (real BI)"
        subtitle={
          benchmark?.comparisonAvailable
            ? `Rank ${benchmark.yourRank || '—'} of ${benchmark.peerCount} · from exec BI aggregates`
            : 'Company average from real branch breakdown — no ×1.05 filler'
        }
      >
        {!mayViewReports ? (
          <EmptyNote text="Reports permission required for company benchmark." />
        ) : !benchmark ? (
          <EmptyNote text="Benchmark unavailable — showing branch snapshot only (no synthetic company avg)." />
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-ui-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-bold">Metric</th>
                <th className="py-2 pr-3 font-bold text-right">You</th>
                <th className="py-2 font-bold text-right">Company avg</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((row) => (
                <tr key={row.label} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.label}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums font-black text-zarewa-teal">
                    {row.money ? formatNgn(row.you) : row.you}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {row.company == null || row.company === ''
                      ? '—'
                      : row.money
                        ? formatNgn(row.company)
                        : row.company}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {peers.length > 1 ? (
          <div className="mt-4">
            <p className="text-ui-xs font-bold uppercase text-slate-500 mb-2">Peer ranking (produced revenue)</p>
            <ul className="space-y-1">
              {peers.slice(0, 8).map((p, i) => (
                <li
                  key={p.branchId}
                  className={`flex justify-between gap-2 text-xs ${
                    String(p.branchId) === String(benchmark.branchId) ? 'font-black text-zarewa-teal' : 'text-slate-700'
                  }`}
                >
                  <span>
                    {i + 1}. {p.branchName}
                  </span>
                  <span className="tabular-nums">{formatNgn(p.producedRevenueNgn)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PanelShell>
    </div>
  );
}
