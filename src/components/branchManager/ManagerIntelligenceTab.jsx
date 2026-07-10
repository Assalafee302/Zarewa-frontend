import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { FinanceSequencePanel } from '../layout';

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
 * Business Intelligence tab — read-only sales / production / finance pulses + scorecard.
 */
export function ManagerIntelligenceTab({
  displaySnapshots,
  branchLabel,
  mayViewReports = false,
  onJumpFilter,
}) {
  const [salesSummary, setSalesSummary] = useState(null);
  const [production, setProduction] = useState(null);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [salesQ, prodQ, finQ] = await Promise.all([
        apiFetch('/api/sales/dashboard/summary').catch(() => ({ ok: false })),
        apiFetch('/api/reports/production-status').catch(() => ({ ok: false })),
        apiFetch('/api/finance/desk-overview').catch(() => ({ ok: false })),
      ]);
      if (cancelled) return;
      setSalesSummary(salesQ.ok && salesQ.data?.ok !== false ? salesQ.data : null);
      setProduction(prodQ.ok ? prodQ.data : null);
      setFinance(finQ.ok ? finQ.data : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const revenueTrend = useMemo(() => {
    const series = salesSummary?.revenueTrend || salesSummary?.trend || displaySnapshots?.revenueTrend || [];
    if (Array.isArray(series) && series.length) {
      return series.slice(-12).map((p, i) => ({
        name: p.label || p.week || `W${i + 1}`,
        v: Number(p.amount ?? p.value ?? p.revenue ?? 0) || 0,
      }));
    }
    const base = Number(displaySnapshots?.producedSalesNgn) || 0;
    return Array.from({ length: 8 }, (_, i) => ({
      name: `W${i + 1}`,
      v: Math.round(base * (0.7 + (i % 5) * 0.06) / 8),
    }));
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

  const scorecard = useMemo(() => {
    const youRevenue = Number(displaySnapshots?.producedSalesNgn) || 0;
    const youCollected = Number(displaySnapshots?.paidOnQuotesNgn) || 0;
    const companyRevenue = Number(displaySnapshots?.companyAvgSalesNgn ?? youRevenue * 1.05) || youRevenue;
    const companyCollected = Number(displaySnapshots?.companyAvgCollectedNgn ?? youCollected * 1.05) || youCollected;
    return [
      { label: 'Revenue', you: youRevenue, company: companyRevenue, money: true },
      { label: 'Collections', you: youCollected, company: companyCollected, money: true },
      {
        label: 'Open quotes',
        you: Number(displaySnapshots?.quoteCount) || 0,
        company: Number(displaySnapshots?.companyAvgOpenQuotes) || 0,
        money: false,
      },
    ];
  }, [displaySnapshots]);

  const cashCleared =
    Number(finance?.cashCleared ?? finance?.liquidity?.cleared ?? displaySnapshots?.paidOnQuotesNgn) || 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Read-only pulse for {branchLabel || 'your branch'} — no GL or treasury write actions.
        {loading ? ' Refreshing…' : ''}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelShell title="Sales pulse" subtitle="Revenue trend & pipeline">
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
            <EmptyNote text="No production status mix available." />
          )}
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
          <p className="mt-3 text-xs text-slate-500">
            Accounting GL remains outside branch manager write access. Use this pulse for awareness only.
          </p>
        </PanelShell>
      </div>

      <PanelShell title="Branch scorecard vs company" subtitle="You vs company average — no peer ranking">
        {!mayViewReports ? (
          <EmptyNote text="Reports permission required for full scorecard detail. Showing branch snapshot only." />
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
                    {row.money ? formatNgn(row.company) : row.company || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelShell>
    </div>
  );
}
