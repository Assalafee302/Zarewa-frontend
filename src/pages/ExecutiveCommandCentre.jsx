import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  FileText,
  Layers,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MainPanel } from '../components/layout';
import { formatNgn } from '../Data/mockData';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
];

const BRANCH_OPTIONS = [
  { id: 'ALL', label: 'All Branches' },
  { id: 'BR-KD', label: 'Kaduna (HQ)' },
  { id: 'BR-YL', label: 'Yola Factory' },
  { id: 'BR-MDG', label: 'Maiduguri Factory' },
];

function alertTone(level) {
  if (level === 'critical') return 'border-rose-300 bg-rose-50 text-rose-950';
  if (level === 'warning') return 'border-amber-300 bg-amber-50/90 text-amber-950';
  if (level === 'opportunity') return 'border-emerald-200 bg-emerald-50/80 text-emerald-950';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function priorityChip(p) {
  if (p === 'high') return 'bg-rose-100 text-rose-900 ring-rose-200';
  if (p === 'medium') return 'bg-amber-100 text-amber-950 ring-amber-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function EstChip() {
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide bg-amber-100 text-amber-900 ring-1 ring-amber-200/80">
      Est.
    </span>
  );
}

function formatLastUpdated(iso) {
  const s = String(iso || '').trim();
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatPeriodWindow(period) {
  if (!period?.startISO || !period?.endISO) return null;
  if (period.startISO === period.endISO) return period.startISO;
  return `${period.startISO} – ${period.endISO}`;
}

function cashMetricDisplay(label, val, flags = {}) {
  const isCount =
    flags.isCount === true ||
    flags.isCount === 'true' ||
    /\(count\)/i.test(String(label || '')) ||
    /awaiting md$/i.test(String(label || '').trim());
  if (isCount) return String(Number(val) || 0);
  return formatNgn(Number(val) || 0);
}

function KpiCard({ label, value, sub, icon, loading, accent, estimated }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm min-h-[108px] ${
        accent === 'gold'
          ? 'border-amber-200/90 bg-gradient-to-br from-amber-50/60 to-white'
          : 'border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80'
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 flex-wrap">
        {icon}
        {label}
        {estimated ? <EstChip /> : null}
      </p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <p className="mt-2 text-2xl font-black tabular-nums text-[#134e4a]">{value}</p>
      )}
      {sub ? <p className="mt-1 text-[10px] text-slate-500 leading-snug">{sub}</p> : null}
    </div>
  );
}

function Section({ title, subtitle, children, icon }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#134e4a]/5 to-transparent px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#134e4a]">
          {icon}
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500 max-w-3xl">{subtitle}</p> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SkuTable({ rows, emptyLabel }) {
  if (!rows?.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-xs min-w-[520px]">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3">SKU</th>
            <th className="py-2 pr-3">Signal</th>
            <th className="py-2 pr-3 text-right">
              Cover <EstChip />
            </th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.gauge}-${row.colour}-${i}`} className="border-b border-slate-50">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">
                {row.gauge} {row.colour}{' '}
                <span className="text-slate-400 font-normal capitalize">{row.family}</span>
              </td>
              <td className="py-2.5 pr-3 text-slate-600 max-w-[200px]">{row.reason || '—'}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-slate-800">
                {row.weeksCover != null ? `${row.weeksCover} wk` : '—'}
              </td>
              <td className="py-2.5 text-right">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ring-1 ${
                    row.label === 'Buy Soon' || row.label === 'Critical'
                      ? 'bg-amber-100 text-amber-950 ring-amber-200'
                      : row.label === 'Liquidate'
                        ? 'bg-slate-100 text-slate-700 ring-slate-200'
                        : 'bg-teal-50 text-[#134e4a] ring-teal-100'
                  }`}
                >
                  {row.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExecutiveCommandCentre() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [periodKey, setPeriodKey] = useState('month');
  const [branchId, setBranchId] = useState('ALL');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const roleLabel = roleKey === 'md' ? 'Managing Director' : roleKey === 'ceo' ? 'CEO' : roleKey || 'Executive';
  const canPickBranch = Boolean(ws?.viewAllBranches || data?.actor?.canUseAllBranches);

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    const qs = new URLSearchParams({ periodKey });
    if (canPickBranch && branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    else if (canPickBranch && branchId === 'ALL') qs.set('branchId', 'ALL');
    const { ok, data: d } = await apiFetch(`/api/exec/dashboard?${qs.toString()}`);
    setBusy(false);
    if (!ok || !d?.ok) {
      setData(null);
      setErr(d?.error || 'Could not load executive command centre.');
      return;
    }
    setData(d);
  }, [periodKey, branchId, canPickBranch]);

  useEffect(() => {
    void load();
  }, [load]);

  const materialTab = useMemo(() => {
    const sku = data?.inventory?.skuIntelligence || {};
    const bestAlu = sku.aluminium?.topCombinations?.[0];
    const bestAz = sku.aluzinc?.topCombinations?.[0];
    return { sku, bestAlu, bestAz };
  }, [data]);

  if (!ws?.hasPermission?.('exec.dashboard.view')) {
    return <Navigate to="/" replace />;
  }

  const kpis = data?.kpis || {};
  const readOnly = Boolean(data?.workTray?.readOnlyForActor ?? data?.actor?.readOnlyExecutiveView);
  const periodWindow = formatPeriodWindow(data?.period);
  const branchScopeLabel =
    data?.branchScope === 'ALL'
      ? 'All branches'
      : BRANCH_OPTIONS.find((b) => b.id === data?.branchScope)?.label || data?.branchScope || '';
  const showBranchComparison = Boolean(data?.branches?.comparisonAvailable);
  const branchComparisonEmpty = !showBranchComparison && !busy && data;

  return (
    <MainPanel className="bg-slate-50/50">
      <header className="mb-8 rounded-2xl border border-[#134e4a]/15 bg-gradient-to-br from-[#134e4a] via-[#0f3d3a] to-[#134e4a] text-white shadow-lg overflow-hidden">
        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200/90">
                Zarewa Aluminium &amp; Plastics
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Executive Command Centre</h1>
              <p className="mt-2 text-sm text-teal-50/85 max-w-2xl leading-relaxed">
                Company-wide performance, approvals, financial control, and operational visibility for
                Aluminium, Aluzinc, and Stonecoated roofing materials.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-white/20">
                  {roleLabel}
                </span>
                {readOnly ? (
                  <span className="rounded-lg bg-amber-400/20 px-3 py-1 text-[10px] font-black uppercase text-amber-100 ring-1 ring-amber-300/30">
                    Read-only
                  </span>
                ) : null}
                {data?.degraded ? (
                  <span className="rounded-lg bg-rose-500/30 px-3 py-1 text-[10px] font-black uppercase">
                    Partial data
                  </span>
                ) : null}
              </div>
              {periodWindow || branchScopeLabel ? (
                <p className="mt-3 text-[11px] text-teal-100/90 font-medium">
                  {periodWindow ? (
                    <span>
                      Data window: <span className="font-bold text-white">{periodWindow}</span>
                    </span>
                  ) : null}
                  {periodWindow && branchScopeLabel ? ' · ' : null}
                  {branchScopeLabel ? (
                    <span>
                      Scope: <span className="font-bold text-white">{branchScopeLabel}</span>
                    </span>
                  ) : null}
                </p>
              ) : null}
              {data?.generatedAtISO ? (
                <p className="mt-1 text-[11px] text-teal-200/80">
                  Last updated: {formatLastUpdated(data.generatedAtISO)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end shrink-0">
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"
                aria-label="Period"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.key} value={p.key} className="text-slate-900">
                    {p.label}
                  </option>
                ))}
              </select>
              {canPickBranch ? (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm"
                  aria-label="Branch"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">
                      {b.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-[11px] font-black uppercase text-[#134e4a] disabled:opacity-50"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400/20 px-4 py-2 text-[11px] font-black uppercase text-amber-50"
              >
                <FileText size={14} />
                Reports
              </button>
            </div>
          </div>
        </div>
      </header>

      {err ? (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      {data?.degradedReason ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.degradedReason} — KPIs may be incomplete.
        </p>
      ) : null}

      {(data?.dataScopeNotes || []).map((note) => (
        <p
          key={note.id}
          className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 leading-relaxed"
        >
          {note.message}
        </p>
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 mb-8">
        <KpiCard
          label="Sales This Period"
          value={formatNgn(kpis.salesNgn ?? 0)}
          sub={kpis.salesLabel || 'Produced revenue'}
          icon={<TrendingUp size={12} />}
          loading={busy && !data}
          estimated
        />
        <KpiCard
          label="Collections"
          value={formatNgn(kpis.collectionsNgn ?? 0)}
          sub="Receipts in period"
          icon={<Wallet size={12} />}
          loading={busy && !data}
        />
        <KpiCard
          label={kpis.collectionRateLabel || 'Quoted Collection Rate'}
          value={kpis.collectionRatePct != null ? `${kpis.collectionRatePct}%` : '—'}
          sub="Collected ÷ quoted value in period"
          icon={<BarChart3 size={12} />}
          loading={busy && !data}
        />
        <KpiCard
          label="Outstanding Balance"
          value={formatNgn(kpis.outstandingReceivablesNgn ?? 0)}
          sub="Customer receivables"
          icon={<AlertTriangle size={12} />}
          loading={busy && !data}
          accent="gold"
        />
        <KpiCard
          label="Cash / Bank"
          value={formatNgn(kpis.treasuryCashNgn ?? 0)}
          sub="Treasury accounts"
          icon={<Building2 size={12} />}
          loading={busy && !data}
        />
        <KpiCard
          label="Inventory Value"
          value={formatNgn(kpis.inventoryValueNgn ?? 0)}
          sub="Coil valuation from landed cost"
          icon={<Layers size={12} />}
          loading={busy && !data}
          estimated
        />
        <KpiCard
          label="Expenses"
          value={formatNgn(kpis.expensesNgn ?? 0)}
          sub={
            kpis.expenseToSalesPct != null
              ? `${kpis.expenseToSalesPct}% of produced sales`
              : 'Operating expenses'
          }
          icon={<TrendingDown size={12} />}
          loading={busy && !data}
        />
        <KpiCard
          label="Pending Actions"
          value={String(kpis.pendingExecutiveActions ?? 0)}
          sub="Executive work tray"
          icon={<Shield size={12} />}
          loading={busy && !data}
          accent="gold"
        />
        <KpiCard
          label="Critical Alerts"
          value={String(kpis.criticalAlerts ?? 0)}
          sub="Needs management decision"
          icon={<Sparkles size={12} />}
          loading={busy && !data}
        />
      </div>

      <div className="space-y-8 pb-12">
        <Section
          title="Decision Alerts"
          subtitle="Management insights from stock, cash, collections, and expenses."
          icon={<Sparkles size={18} className="text-amber-600" />}
        >
          {!data?.decisionAlerts?.length && !busy ? (
            <p className="text-sm text-slate-500">No active alerts for this period.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(data?.decisionAlerts || []).map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 ${alertTone(a.level)}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{a.title}</p>
                  <p className="mt-2 text-sm font-medium leading-snug">{a.message}</p>
                  {a.route ? (
                    <Link
                      to={a.route}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#134e4a] hover:underline"
                    >
                      View detail <ArrowRight size={12} />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Product & Stock Intelligence"
          subtitle={`Aluminium, Aluzinc, and Stonecoated. Coil valuation and weeks-cover signals are estimated.`}
          icon={<Layers size={18} className="text-teal-600" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {['aluminium', 'aluzinc'].map((fam) => {
              const block = materialTab.sku[fam];
              const top = block?.topCombinations?.[0];
              const buy = block?.buyNext || [];
              const slow = block?.reduceStock || [];
              return (
                <div key={fam} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#134e4a] capitalize">
                    {fam === 'aluzinc' ? 'Aluzinc' : 'Aluminium'}
                  </h3>
                  {top ? (
                    <p className="mt-2 text-sm text-slate-700">
                      <span className="font-bold">Best seller:</span> {top.gauge} · {top.colour} ·{' '}
                      {top.profile} — {top.metres?.toLocaleString()} m
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No production mix in period.</p>
                  )}
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Buy / watch</p>
                    <SkuTable
                      rows={buy.map((r) => ({ ...r, family: fam, label: r.action === 'buy' ? 'Buy Soon' : 'Watch' }))}
                      emptyLabel="No urgent replenishment."
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Slow moving</p>
                    <SkuTable
                      rows={slow.map((r) => ({ ...r, family: fam, label: 'Liquidate' }))}
                      emptyLabel="No liquidate signals."
                    />
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#134e4a]">Stonecoated</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {data?.inventory?.skuIntelligence?.stonecoated?.note ||
                  'Summary from production mix; full SKU weeks-cover not applied.'}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">Metres (period)</dt>
                  <dd className="font-black tabular-nums">
                    {(data?.inventory?.skuIntelligence?.stonecoated?.metres ?? 0).toLocaleString()} m
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">Revenue share</dt>
                  <dd className="font-black tabular-nums">
                    {data?.inventory?.skuIntelligence?.stonecoated?.sharePctMetres ?? '—'}%
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section
            title="Finance & Expenses"
            subtitle="Category and branch spend vs produced sales."
            icon={<TrendingDown size={18} className="text-rose-700" />}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  Productive <EstChip />
                </p>
                <p className="text-lg font-black text-[#134e4a]">
                  {formatNgn(data?.expenses?.productiveOverhead?.productiveNgn ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  Overhead <EstChip />
                </p>
                <p className="text-lg font-black text-[#134e4a]">
                  {formatNgn(data?.expenses?.productiveOverhead?.overheadNgn ?? 0)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                    <th className="py-2 text-left">Category</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.expenses?.topCategories || []).slice(0, 10).map((row) => (
                    <tr key={row.category} className="border-b border-slate-50">
                      <td className="py-2 font-semibold text-slate-800">{row.category}</td>
                      <td className="py-2 text-right tabular-nums">{formatNgn(row.amountNgn)}</td>
                      <td className="py-2 text-right tabular-nums">{row.sharePct ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Cash & Working Capital"
            subtitle="Components only — not a statutory working capital statement. Cash-pressure horizons are estimated."
            icon={<Wallet size={18} className="text-teal-600" />}
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Cash / bank', val: data?.cash?.cashNgn },
                { label: 'Receivables', val: data?.cash?.receivablesNgn },
                { label: 'Inventory', val: data?.cash?.inventoryValueNgn, estimated: true },
                { label: 'Pending outflows', val: data?.cash?.pendingOutflowsNgn },
                {
                  label: 'Pending refunds',
                  val: data?.cash?.pendingRefunds,
                  isCount: data?.cash?.pendingRefundsIsCount !== false,
                },
                {
                  label: 'Payroll awaiting MD',
                  val: data?.cash?.payrollDraftsAwaitingMd,
                  isCount: data?.cash?.payrollDraftsAwaitingMdIsCount !== false,
                },
              ].map(({ label, val, isCount, estimated }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                    {label}
                    {estimated ? <EstChip /> : null}
                  </dt>
                  <dd className="mt-1 font-black tabular-nums text-[#134e4a]">
                    {cashMetricDisplay(label, val, { isCount })}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {data?.cash?.safeWithdrawalNote ||
                'Safe withdrawal estimate will appear after reserve policies are configured.'}
            </p>
            {(data?.cash?.horizons || []).length ? (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                  Cash pressure horizons <EstChip />
                </p>
                <div className="flex flex-wrap gap-2">
                {data.cash.horizons.map((h) => (
                  <span
                    key={h.days}
                    className={`rounded-lg px-3 py-2 text-[10px] font-bold ring-1 ${
                      h.stress === 'deficit'
                        ? 'bg-rose-50 text-rose-800 ring-rose-200'
                        : h.stress === 'tight'
                          ? 'bg-amber-50 text-amber-900 ring-amber-200'
                          : 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                    }`}
                  >
                    {h.days}d: {formatNgn(h.projectedBalanceNgn)} ({h.stress})
                  </span>
                ))}
                </div>
              </div>
            ) : null}
          </Section>
        </div>

        <Section
          title="Branch Performance"
          subtitle={
            showBranchComparison
              ? 'Kaduna, Yola, and Maiduguri comparison for the selected period.'
              : 'Branch comparison requires an all-branches view.'
          }
          icon={<Building2 size={18} className="text-teal-600" />}
        >
          {showBranchComparison ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                ['Best performing', data?.branches?.highlights?.bestPerformingBranch],
                ['Highest debtor', data?.branches?.highlights?.highestDebtorBranch],
                ['Lowest collection', data?.branches?.highlights?.lowestCollectionRateBranch],
                ['Highest stock risk', data?.branches?.highlights?.highestStockRiskBranch],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-amber-900/70">{label}</p>
                  <p className="text-sm font-bold text-[#134e4a] mt-1">{val || '—'}</p>
                </div>
              ))}
            </div>
          ) : null}
          {branchComparisonEmpty ? (
            <p className="text-sm text-slate-600 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center leading-relaxed">
              {data?.branches?.comparisonEmptyReason === 'single_branch'
                ? 'Select All Branches to compare Kaduna, Yola, and Maiduguri.'
                : 'No branch comparison rows for this scope. Select All Branches to compare locations.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                    <th className="py-2 text-left">Branch</th>
                    <th className="py-2 text-right">Produced sales</th>
                    <th className="py-2 text-right">Collections</th>
                    <th className="py-2 text-right">
                      <span className="block">Produced coll. %</span>
                      <span className="font-normal normal-case text-slate-400 text-[9px]">
                        Collected ÷ produced
                      </span>
                    </th>
                    <th className="py-2 text-right">Customer debt</th>
                    <th className="py-2 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        Stock value <EstChip />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.branches?.byBranch || []).map((b) => (
                    <tr key={b.branchId} className="border-b border-slate-50">
                      <td className="py-2.5 font-semibold">{b.branchName || b.branchId}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.producedRevenueNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.netCollectedNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {b.collectionRatePct != null ? `${b.collectionRatePct}%` : '—'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.customerDebtNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.coilValuationNgn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Executive Work Tray"
          subtitle={
            readOnly
              ? 'Review items below. Actions open detail screens; approvals follow your role permissions.'
              : 'Use Review to open the manager desk or module route. Server enforces approvals.'
          }
          icon={<Shield size={18} className="text-[#134e4a]" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                  <th className="py-2 text-left">Priority</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Branch</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-left">Requested by</th>
                  <th className="py-2 text-left">Age</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.workTray?.items || []).length === 0 && !busy ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No pending executive items.
                    </td>
                  </tr>
                ) : (
                  (data?.workTray?.items || []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${priorityChip(row.priority)}`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold capitalize">
                        {row.kind?.replace(/_/g, ' ')}
                        {row.summaryOnly ? (
                          <span className="ml-1.5 text-[9px] font-black uppercase text-slate-400">
                            Summary
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5">{row.branchName}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {row.amountNgn != null ? formatNgn(row.amountNgn) : '—'}
                      </td>
                      <td className="py-2.5 max-w-[120px] truncate">{row.requestedBy}</td>
                      <td className="py-2.5">{row.ageLabel}</td>
                      <td className="py-2.5">{row.status}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(row.route || '/manager')}
                          className="rounded-lg border border-[#134e4a]/30 bg-[#134e4a]/5 px-3 py-1.5 text-[10px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
                        >
                          {row.summaryOnly
                            ? 'View summary'
                            : row.canAct
                              ? 'Review'
                              : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Section
            title="Risk & Audit Signals"
            subtitle={
              data?.risks?.summaryOnly
                ? 'Summary-level alerts only (full audit log requires additional permission).'
                : 'Consolidated risk signals from BI and operations.'
            }
            icon={<AlertTriangle size={18} className="text-rose-600" />}
          >
            <ul className="space-y-2">
              {(data?.risks?.alerts || []).slice(0, 12).map((a, i) => (
                <li
                  key={a.id || i}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800"
                >
                  <span className="text-[10px] font-black uppercase text-slate-500 mr-2">
                    {a.severity || a.category}
                  </span>
                  {a.message}
                </li>
              ))}
              {!data?.risks?.alerts?.length && !busy ? (
                <li className="text-sm text-slate-500">No risk signals.</li>
              ) : null}
            </ul>
          </Section>

          <Section
            title="Top customers"
            subtitle="Payments and outstanding debt (production-complete basis)."
            icon={<BarChart3 size={18} className="text-teal-600" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">By payments</p>
                <ul className="space-y-2 text-sm">
                  {(data?.sales?.topCustomersByPayments || []).slice(0, 6).map((c) => (
                    <li key={c.customerID} className="flex justify-between gap-2">
                      <span className="truncate font-semibold">{c.customerName}</span>
                      <span className="tabular-nums shrink-0">{formatNgn(c.netCollectedNgn)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">By debt</p>
                <ul className="space-y-2 text-sm">
                  {(data?.sales?.topCustomersByDebt || []).slice(0, 6).map((c) => (
                    <li key={c.customerID} className="flex justify-between gap-2">
                      <span className="truncate font-semibold">{c.customerName}</span>
                      <span className="tabular-nums shrink-0 text-rose-800">{formatNgn(c.debtNgn)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        </div>

        <Section
          title="Executive Reports"
          subtitle="Jump to existing report and analytics routes."
          icon={<FileText size={18} className="text-amber-700" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data?.reports || []).map((r) => (
              <Link
                key={r.title}
                to={r.route}
                className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-[#134e4a]/30 hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-black text-[#134e4a]">{r.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{r.description}</p>
              </Link>
            ))}
          </div>
        </Section>

        <p className="text-[10px] text-slate-400 text-center">
          Generated {data?.generatedAtISO ? new Date(data.generatedAtISO).toLocaleString() : '—'} ·{' '}
          {data?.engineRev || '—'}
          {data?.period ? ` · ${data.period.startISO} – ${data.period.endISO}` : ''}
        </p>
      </div>
    </MainPanel>
  );
}
