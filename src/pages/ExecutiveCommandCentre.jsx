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
  Settings2,
  Shield,
  Sparkles,
  X,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { MainPanel } from '../components/layout';
import { formatNgn } from '../Data/mockData';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { useToast } from '../context/ToastContext';

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

function ScopeChip({ basis }) {
  if (basis !== 'company') return null;
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-black uppercase bg-slate-200 text-slate-700">
      Company-wide
    </span>
  );
}

function debtRiskChip(label) {
  if (label === 'Critical') return 'bg-rose-100 text-rose-900 ring-rose-200';
  if (label === 'High Risk') return 'bg-orange-100 text-orange-950 ring-orange-200';
  if (label === 'Watch') return 'bg-amber-100 text-amber-950 ring-amber-200';
  return 'bg-emerald-50 text-emerald-900 ring-emerald-100';
}

function InfoChip({ children }) {
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-black uppercase bg-slate-100 text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function targetStatusChip(status) {
  if (status === 'Ahead') return 'bg-emerald-100 text-emerald-900 ring-emerald-200';
  if (status === 'Behind') return 'bg-rose-100 text-rose-900 ring-rose-200';
  if (status === 'On Track') return 'bg-teal-50 text-[#134e4a] ring-teal-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function formatWcAmount(line) {
  if (line.available === false) return '—';
  if (line.isCountOnly) return String(line.amountNgn ?? 0);
  if (line.amountNgn == null) return '—';
  return formatNgn(line.amountNgn);
}

function WcLinesTable({ title, lines }) {
  if (!lines?.length) return null;
  return (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase text-slate-500 mb-2">{title}</p>
      <table className="w-full text-xs">
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-50">
              <td className="py-2 pr-2 font-medium text-slate-800">
                {line.label}
                {line.estimated ? (
                  <span className="ml-1">
                    <EstChip />
                  </span>
                ) : null}
                {line.scopeBasis === 'company' ? (
                  <span className="ml-1">
                    <ScopeChip basis="company" />
                  </span>
                ) : null}
              </td>
              <td className="py-2 text-right tabular-nums font-bold text-[#134e4a]">
                {formatWcAmount(line)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkuTable({ rows, emptyLabel }) {
  if (!rows?.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-xs min-w-[720px]">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3">SKU</th>
            <th className="py-2 pr-3">Period movement</th>
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
                <p className="mt-1 text-[9px] font-normal text-slate-500 leading-snug max-w-[200px]">
                  {row.reason || row.lookbackDemandBasisLabel || '—'}
                </p>
              </td>
              <td className="py-2.5 pr-3 text-slate-600 tabular-nums">
                {row.selectedPeriodMetres != null ? (
                  <span className="block">{row.selectedPeriodMetres.toLocaleString()} m</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
                {row.selectedPeriodRevenueNgn != null ? (
                  <span className="block text-[10px] text-slate-500">{formatNgn(row.selectedPeriodRevenueNgn)}</span>
                ) : null}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-slate-800">
                {row.weeksCover != null ? `${row.weeksCover} wk` : '—'}
              </td>
              <td className="py-2.5 text-right">
                {row.route ? (
                  <Link
                    to={row.route}
                    className="text-[10px] font-bold text-[#134e4a] hover:underline"
                  >
                    {row.recommendation || row.label}
                  </Link>
                ) : (
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ring-1 ${
                    (row.recommendation || row.label) === 'Buy Soon' ||
                    (row.recommendation || row.label) === 'Critical'
                      ? 'bg-amber-100 text-amber-950 ring-amber-200'
                      : (row.recommendation || row.label) === 'Liquidate'
                        ? 'bg-slate-100 text-slate-700 ring-slate-200'
                        : 'bg-teal-50 text-[#134e4a] ring-teal-100'
                  }`}
                >
                  {row.recommendation || row.label}
                </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_RESERVE_FORM = {
  operatingReserveNgn: '',
  emergencyReserveNgn: '',
  payrollReserveNgn: '',
  supplierPaymentReserveNgn: '',
  stockPurchaseReserveNgn: '',
  taxStatutoryReserveNgn: '',
  includeReceivables: false,
  includeInventory: false,
  includePoCommitments: true,
  policyNotes: '',
};

export default function ExecutiveCommandCentre() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const [periodKey, setPeriodKey] = useState('month');
  const [branchId, setBranchId] = useState('ALL');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState(EMPTY_RESERVE_FORM);
  const [reserveSaving, setReserveSaving] = useState(false);
  const [reserveModalBusy, setReserveModalBusy] = useState(false);

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

  const readOnly = Boolean(data?.workTray?.readOnlyForActor ?? data?.actor?.readOnlyExecutiveView);
  const canManageReservePolicy = Boolean(data?.actor?.canManageReservePolicy);

  const openReservePolicyModal = useCallback(async () => {
    setReserveModalOpen(true);
    setReserveModalBusy(true);
    const { ok, data: pol } = await apiFetch('/api/exec/reserve-policy');
    setReserveModalBusy(false);
    if (!ok || !pol?.ok) {
      showToast(pol?.error || 'Could not load reserve policy.', { variant: 'error' });
      return;
    }
    const p = pol.policy || {};
    setReserveForm({
      operatingReserveNgn: p.operatingReserveNgn?.value ?? '',
      emergencyReserveNgn: p.emergencyReserveNgn?.value ?? '',
      payrollReserveNgn: p.payrollReserveNgn?.value ?? '',
      supplierPaymentReserveNgn: p.supplierPaymentReserveNgn?.value ?? '',
      stockPurchaseReserveNgn: p.stockPurchaseReserveNgn?.value ?? '',
      taxStatutoryReserveNgn: p.taxStatutoryReserveNgn?.value ?? '',
      includeReceivables: Boolean(p.includeReceivables?.value),
      includeInventory: Boolean(p.includeInventory?.value),
      includePoCommitments: p.includePoCommitments?.value !== false,
      policyNotes: p.policyNotes?.value ?? '',
    });
  }, [showToast]);

  const saveReservePolicy = async (e) => {
    e.preventDefault();
    const amounts = [
      'operatingReserveNgn',
      'emergencyReserveNgn',
      'payrollReserveNgn',
      'supplierPaymentReserveNgn',
      'stockPurchaseReserveNgn',
      'taxStatutoryReserveNgn',
    ];
    for (const f of amounts) {
      const n = Number(reserveForm[f]);
      if (!Number.isFinite(n) || n < 0) {
        showToast('All reserve amounts must be non-negative numbers.', { variant: 'error' });
        return;
      }
    }
    setReserveSaving(true);
    const body = {
      operatingReserveNgn: Math.round(Number(reserveForm.operatingReserveNgn)),
      emergencyReserveNgn: Math.round(Number(reserveForm.emergencyReserveNgn)),
      payrollReserveNgn: Math.round(Number(reserveForm.payrollReserveNgn)),
      supplierPaymentReserveNgn: Math.round(Number(reserveForm.supplierPaymentReserveNgn)),
      stockPurchaseReserveNgn: Math.round(Number(reserveForm.stockPurchaseReserveNgn)),
      taxStatutoryReserveNgn: Math.round(Number(reserveForm.taxStatutoryReserveNgn)),
      includeReceivables: Boolean(reserveForm.includeReceivables),
      includeInventory: Boolean(reserveForm.includeInventory),
      includePoCommitments: Boolean(reserveForm.includePoCommitments),
      policyNotes: String(reserveForm.policyNotes || '').trim(),
    };
    const { ok, data: res } = await apiFetch('/api/exec/reserve-policy', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    setReserveSaving(false);
    if (!ok || !res?.ok) {
      showToast(res?.error || 'Could not save reserve policy.', { variant: 'error' });
      return;
    }
    showToast('Reserve policy saved.');
    setReserveModalOpen(false);
    void load();
  };

  if (!ws?.hasPermission?.('exec.dashboard.view')) {
    return <Navigate to="/" replace />;
  }

  const kpis = data?.kpis || {};
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

      {data?.targets ? (
        <Section
          title="Targets vs Actuals"
          subtitle={data.targets.note || 'Company-level targets from org configuration.'}
          icon={<BarChart3 size={18} className="text-teal-600" />}
        >
          <div className="flex flex-wrap gap-2 mb-4">
            <InfoChip>Company</InfoChip>
            {!data.targets.configured ? <InfoChip>No target set</InfoChip> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                  <th className="py-2 text-left">Metric</th>
                  <th className="py-2 text-right">Target</th>
                  <th className="py-2 text-right">Actual</th>
                  <th className="py-2 text-right">Variance</th>
                  <th className="py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.targets.rows || []).map((row) => (
                  <tr key={row.metricKey} className="border-b border-slate-50">
                    <td className="py-2.5 font-semibold text-slate-800">{row.label}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.target != null
                        ? row.unit === 'm'
                          ? `${row.target.toLocaleString()} m`
                          : formatNgn(row.target)
                        : '—'}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.unit === 'm' ? `${(row.actual ?? 0).toLocaleString()} m` : formatNgn(row.actual ?? 0)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      {row.variancePct != null ? `${row.variancePct > 0 ? '+' : ''}${row.variancePct}%` : '—'}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${targetStatusChip(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                      {a.level}
                    </span>
                    {a.sourceSection ? (
                      <span className="text-[9px] font-bold uppercase opacity-60">{a.sourceSection}</span>
                    ) : null}
                    {a.estimated ? <EstChip /> : null}
                  </div>
                  <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider opacity-80">
                    {a.title}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug">{a.message}</p>
                  {a.metric ? (
                    <p className="mt-1 text-[10px] font-bold tabular-nums opacity-80">{a.metric}</p>
                  ) : null}
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
          {data?.inventory?.skuPeriodNote ? (
            <p className="mb-3 text-xs text-slate-600 leading-relaxed rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              {data.inventory.skuPeriodNote}
            </p>
          ) : null}
          {data?.inventory?.drillRoutes ? (
            <p className="mb-4 text-[10px] text-slate-500">
              <Link to={data.inventory.drillRoutes.analytics} className="font-bold text-teal-800 hover:underline">
                Stock intelligence
              </Link>
              {' · '}
              <Link to={data.inventory.drillRoutes.operations} className="font-bold text-teal-800 hover:underline">
                Operations
              </Link>
            </p>
          ) : null}
          {(data?.inventory?.recommendations || []).length ? (
            <ul className="mb-4 space-y-1 text-xs text-slate-700">
              {data.inventory.recommendations.slice(0, 5).map((r, i) => (
                <li key={i}>
                  {r.route ? (
                    <Link to={r.route} className="font-semibold text-[#134e4a] hover:underline">
                      {r.message}
                    </Link>
                  ) : (
                    r.message
                  )}
                </li>
              ))}
            </ul>
          ) : null}
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

        {data?.materialCosting ? (
          <Section
            title="Estimated Material Cost per Metre"
            subtitle={data.materialCosting.label}
            icon={<Layers size={18} className="text-teal-600" />}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <InfoChip>Material only</InfoChip>
              <EstChip />
            </div>
            {(data.materialCosting.notes || []).map((n, i) => (
              <p
                key={i}
                className="mb-2 text-xs text-slate-600 leading-relaxed rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {n}
              </p>
            ))}
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-xs min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-2">Job / product</th>
                    <th className="py-2 pr-2 text-right">Metres</th>
                    <th className="py-2 pr-2 text-right">Kg</th>
                    <th className="py-2 pr-2 text-right">Est. material</th>
                    <th className="py-2 text-right">Est. ₦/m</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.materialCosting.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No completed production with material cost in this period.
                      </td>
                    </tr>
                  ) : (
                    (data.materialCosting.rows || []).slice(0, 15).map((row) => (
                      <tr key={row.jobId} className="border-b border-slate-50">
                        <td className="py-2.5 font-semibold text-slate-800">
                          {row.productLabel}
                          <span className="block text-[9px] text-slate-500 font-normal">{row.jobId}</span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{row.actualMetres ?? '—'}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.consumedKg ?? '—'}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {row.costUnavailable ? 'Cost unavailable' : formatNgn(row.estimatedMaterialCostNgn ?? 0)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-bold">
                          {row.costUnavailable
                            ? '—'
                            : row.estimatedMaterialCostPerMetreNgn != null
                              ? formatNgn(row.estimatedMaterialCostPerMetreNgn)
                              : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

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
                  scope: data?.cash?.pendingRefundsScope,
                },
                {
                  label: 'Payroll awaiting MD',
                  val: data?.cash?.payrollDraftsAwaitingMd,
                  isCount: data?.cash?.payrollDraftsAwaitingMdIsCount !== false,
                  scope: data?.cash?.payrollDraftsAwaitingMdScope,
                },
              ].map(({ label, val, isCount, estimated, scope }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5 flex-wrap">
                    {label}
                    {estimated ? <EstChip /> : null}
                    <ScopeChip basis={scope} />
                  </dt>
                  <dd className="mt-1 font-black tabular-nums text-[#134e4a]">
                    {cashMetricDisplay(label, val, { isCount })}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
              {data?.cash?.pressureModelLabel ||
                'Estimated cash pressure based on recent treasury activity'}
              . {data?.cash?.notSafeWithdrawalNote || 'Not a safe-withdrawal calculation'}.
              {data?.cash?.horizonBasis ? ` ${data.cash.horizonBasis}.` : ''}
            </p>
            <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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

          <Section
            title="Reserve Policy Readiness"
            subtitle="Reserve policy — management decision support. Not a withdrawal instruction."
            icon={<Shield size={18} className="text-amber-700" />}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {data?.reservePolicy?.configured ? (
                <InfoChip>Policy configured</InfoChip>
              ) : (
                <InfoChip>Policy missing</InfoChip>
              )}
              <InfoChip>Headroom hidden</InfoChip>
              {readOnly ? <InfoChip>Read-only</InfoChip> : null}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-2">{data?.reservePolicy?.note}</p>
            <p className="text-xs text-slate-600 mb-3">
              {data?.reservePolicy?.phaseNote ||
                'Indicative expansion headroom remains hidden in this phase.'}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase text-slate-500">Completion</dt>
                <dd className="mt-0.5 font-black tabular-nums text-[#134e4a]">
                  {data?.reservePolicy?.completionPct ?? 0}%
                </dd>
              </div>
              {data?.reservePolicy?.updatedAtISO ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 col-span-2">
                  <dt className="text-[10px] font-bold uppercase text-slate-500">Last updated</dt>
                  <dd className="mt-0.5 text-xs text-slate-700">
                    {new Date(data.reservePolicy.updatedAtISO).toLocaleString()}
                    {data.reservePolicy.updatedBy ? ` · ${data.reservePolicy.updatedBy}` : ''}
                  </dd>
                </div>
              ) : null}
            </dl>
            {data?.reservePolicy?.policy ? (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Reserve amounts (₦)</p>
                <ul className="text-xs text-slate-700 space-y-1">
                  {[
                    ['operatingReserveNgn', 'Operating'],
                    ['emergencyReserveNgn', 'Emergency'],
                    ['payrollReserveNgn', 'Payroll'],
                    ['supplierPaymentReserveNgn', 'Supplier payment'],
                    ['stockPurchaseReserveNgn', 'Stock purchase'],
                    ['taxStatutoryReserveNgn', 'Tax / statutory'],
                  ].map(([key, short]) => {
                    const item = data.reservePolicy.policy[key];
                    return (
                      <li key={key} className="flex justify-between gap-2">
                        <span>
                          {short}
                          {!item?.configured ? (
                            <span className="ml-1">
                              <InfoChip>Required</InfoChip>
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums font-semibold">
                          {item?.configured ? formatNgn(item.value) : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <ul className="text-xs text-slate-700 space-y-2 mb-3">
              {[
                ['includeReceivables', 'Receivables', false],
                ['includeInventory', 'Inventory', false],
                ['includePoCommitments', 'PO commitments', true],
              ].map(([key, label, recommendedDefault]) => {
                const item = data?.reservePolicy?.policy?.[key];
                let chip = <InfoChip>Policy missing</InfoChip>;
                if (item?.configured) {
                  chip = item.value ? (
                    <InfoChip>Included in headroom</InfoChip>
                  ) : (
                    <InfoChip>Excluded from headroom</InfoChip>
                  );
                } else if (recommendedDefault) {
                  chip = (
                    <>
                      <InfoChip>Policy missing</InfoChip>
                      <InfoChip>Recommended</InfoChip>
                    </>
                  );
                }
                return (
                  <li key={key} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{label}</span>
                    {chip}
                  </li>
                );
              })}
            </ul>
            {data?.reservePolicy?.policy?.policyNotes?.value ? (
              <p className="text-xs text-slate-600 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 mb-3">
                <span className="font-bold uppercase text-[10px] text-slate-500 block mb-1">Policy notes</span>
                {data.reservePolicy.policy.policyNotes.value}
              </p>
            ) : null}
            {(data?.reservePolicy?.warnings || []).map((w, i) => (
              <p
                key={i}
                className="mb-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              >
                {w}
              </p>
            ))}
            {!data?.reservePolicy?.configured && (data?.reservePolicy?.missingLabels || []).length ? (
              <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 mb-3">
                {(data.reservePolicy.missingLabels || []).map((lbl) => (
                  <li key={lbl}>{lbl}</li>
                ))}
              </ul>
            ) : null}
            {canManageReservePolicy ? (
              <button
                type="button"
                onClick={() => void openReservePolicyModal()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#134e4a]/30 bg-[#134e4a]/5 px-4 py-2 text-[11px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
              >
                <Settings2 size={16} />
                Configure Reserve Policy
              </button>
            ) : null}
          </Section>

          <Section
            title="Working Capital Snapshot"
            subtitle={data?.workingCapital?.label || 'Estimated working capital snapshot'}
            icon={<Wallet size={18} className="text-teal-600" />}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <InfoChip>Not statutory</InfoChip>
              <InfoChip>Not withdrawable cash</InfoChip>
              <EstChip />
            </div>
            {(data?.workingCapital?.notes || []).map((n, i) => (
              <p
                key={i}
                className="mb-2 text-xs text-slate-600 leading-relaxed rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {n}
              </p>
            ))}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WcLinesTable title="Current assets" lines={data?.workingCapital?.currentAssets} />
              <WcLinesTable title="Current liabilities" lines={data?.workingCapital?.currentLiabilities} />
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <dt className="text-[10px] font-bold uppercase text-slate-500">Assets total</dt>
                <dd className="mt-1 font-black tabular-nums text-[#134e4a]">
                  {formatNgn(data?.workingCapital?.assetTotalNgn ?? 0)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <dt className="text-[10px] font-bold uppercase text-slate-500">Liabilities total</dt>
                <dd className="mt-1 font-black tabular-nums text-[#134e4a]">
                  {formatNgn(data?.workingCapital?.liabilityTotalNgn ?? 0)}
                </dd>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                <dt className="text-[10px] font-bold uppercase text-slate-500">Est. working capital</dt>
                <dd className="mt-1 font-black tabular-nums text-[#134e4a]">
                  {data?.workingCapital?.estimatedWorkingCapitalNgn != null
                    ? formatNgn(data.workingCapital.estimatedWorkingCapitalNgn)
                    : '—'}
                </dd>
                {data?.workingCapital?.ratio != null ? (
                  <p className="text-[10px] text-slate-500 mt-1">Ratio {data.workingCapital.ratio}</p>
                ) : null}
              </div>
            </dl>
          </Section>

          <Section
            title="Payables & Outflows"
            subtitle={data?.payables?.label || 'Supplier and treasury pressure'}
            icon={<TrendingDown size={18} className="text-rose-700" />}
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: 'AP outstanding', val: data?.payables?.apOutstandingNgn },
                { label: 'Approved unpaid PR', val: data?.payables?.approvedUnpaidPaymentRequestsNgn },
                {
                  label: data?.payables?.poCommitmentLabel || 'PO commitment proxy',
                  val: data?.payables?.poCommitmentGapNgn,
                  est: true,
                },
                { label: 'BI pending outflows', val: data?.payables?.pendingOutflowsNgn, est: true },
              ].map(({ label, val, est }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                    {label}
                    {est ? <EstChip /> : null}
                  </dt>
                  <dd className="mt-1 font-black tabular-nums text-[#134e4a]">{formatNgn(val ?? 0)}</dd>
                </div>
              ))}
            </dl>
            {data?.payables?.apAging ? (
              <p className="mt-4 text-xs text-slate-600 tabular-nums">
                AP aging — 0–30: {formatNgn(data.payables.apAging['0_30'])} · 31–60:{' '}
                {formatNgn(data.payables.apAging['31_60'])} · 61–90:{' '}
                {formatNgn(data.payables.apAging['61_90'])} · 90+: {formatNgn(data.payables.apAging.over_90)}
              </p>
            ) : null}
            {(data?.payables?.pressureNotes || []).map((n, i) => (
              <p key={i} className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {n}
              </p>
            ))}
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
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                {[
                  ['Best collections', data?.branches?.highlights?.bestCollectionsBranch],
                  ['Receivables risk', data?.branches?.highlights?.highestReceivablesRisk],
                  ['Expense pressure', data?.branches?.highlights?.highestExpensePressure],
                  ['Stock risk', data?.branches?.highlights?.highestStockRisk],
                  ['Best overall (index)', data?.branches?.highlights?.bestOverallBranch],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                    <p className="text-[9px] font-black uppercase text-amber-900/70">{label}</p>
                    <p className="text-sm font-bold text-[#134e4a] mt-1">{val || '—'}</p>
                  </div>
                ))}
              </div>
              {data?.branches?.scorecardNote ? (
                <p className="text-[10px] text-slate-500 mb-4 leading-snug">{data.branches.scorecardNote}</p>
              ) : null}
            </>
          ) : null}
          {branchComparisonEmpty ? (
            <p className="text-sm text-slate-600 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center leading-relaxed">
              {data?.branches?.comparisonEmptyReason === 'single_branch'
                ? 'Select All Branches to compare Kaduna, Yola, and Maiduguri.'
                : 'No branch comparison rows for this scope. Select All Branches to compare locations.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                    <th className="py-2 text-left">Branch</th>
                    <th className="py-2 text-right">Produced sales</th>
                    <th className="py-2 text-right">Collections</th>
                    <th className="py-2 text-right">Produced coll. %</th>
                    <th className="py-2 text-right">Expenses</th>
                    <th className="py-2 text-right">Exp / sales</th>
                    <th className="py-2 text-right">Receivables</th>
                    <th className="py-2 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        Stock <EstChip />
                      </span>
                    </th>
                    <th className="py-2 text-right">Pending jobs</th>
                    <th className="py-2 text-right">Exec items</th>
                    <th className="py-2 text-right">Risk</th>
                    <th className="py-2 text-right">Index</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.branches?.byBranch || []).map((b) => (
                    <tr key={b.branchId} className="border-b border-slate-50">
                      <td className="py-2.5 font-semibold">{b.branchName || b.branchId}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.producedRevenueNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.netCollectedNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {b.producedCollectionRatePct != null ? `${b.producedCollectionRatePct}%` : '—'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.expensesNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {b.expenseToSalesPct != null ? `${b.expenseToSalesPct}%` : '—'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.customerDebtNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatNgn(b.coilValuationNgn)}</td>
                      <td className="py-2.5 text-right tabular-nums">{b.pendingProductionJobs ?? 0}</td>
                      <td className="py-2.5 text-right tabular-nums">{b.pendingExecutiveItems ?? 0}</td>
                      <td className="py-2.5 text-right tabular-nums">{b.riskFlagCount ?? 0}</td>
                      <td className="py-2.5 text-right tabular-nums font-bold" title={b.internalScoreNote}>
                        {b.internalScore ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {data?.staffActivity ? (
          <Section
            title="Staff Activity"
            subtitle={data.staffActivity.label}
            icon={<Users size={18} className="text-slate-600" />}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <InfoChip>Activity only</InfoChip>
            </div>
            <p className="text-xs text-slate-600 mb-4">{data.staffActivity.legacyNote}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                    <th className="py-2 text-left">Staff</th>
                    <th className="py-2 text-right">Receipts</th>
                    <th className="py-2 text-right">Receipt ₦</th>
                    <th className="py-2 text-right">PR raised</th>
                    <th className="py-2 text-right">Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.staffActivity.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No user-linked activity in this period.
                      </td>
                    </tr>
                  ) : (
                    (data.staffActivity.rows || []).map((row) => (
                      <tr key={row.userId} className="border-b border-slate-50">
                        <td className="py-2.5 font-semibold">{row.displayName}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.receiptsPostedCount}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatNgn(row.receiptValuePostedNgn)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{row.paymentRequestsRaisedCount}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.approvalsActedCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        <Section
          title="Executive Work Tray"
          subtitle={
            readOnly
              ? 'Summary and read-only items — open routes to review detail.'
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
                      <td className="py-2.5">
                        {row.branchName}
                        {row.scopeBasis === 'company' ? (
                          <span className="ml-1">
                            <ScopeChip basis="company" />
                          </span>
                        ) : null}
                      </td>
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
            subtitle={
              data?.sales?.debtBasisLabel ||
              'Payments in period; debt is current outstanding (as at period end).'
            }
            icon={<BarChart3 size={18} className="text-teal-600" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">By payments (period)</p>
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
                <p className="text-[10px] font-black uppercase text-slate-500 mb-2">
                  By debt — {data?.sales?.debtBasisLabel || 'current outstanding'}
                  {data?.sales?.debtSortBasis ? ` (${data.sales.debtSortBasis})` : ''}
                </p>
                <ul className="space-y-3 text-sm">
                  {(data?.sales?.topCustomersByDebt || []).slice(0, 6).map((c) => (
                    <li key={c.customerID} className="border-b border-slate-100 pb-2">
                      <div className="flex justify-between gap-2 items-start">
                        <div className="min-w-0">
                          {c.route ? (
                            <Link
                              to={c.route}
                              className="truncate font-semibold text-[#134e4a] hover:underline block"
                            >
                              {c.customerName}
                            </Link>
                          ) : (
                            <span className="truncate font-semibold block">{c.customerName}</span>
                          )}
                          {c.debtRiskLabel ? (
                            <span
                              className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-black uppercase ring-1 ${debtRiskChip(c.debtRiskLabel)}`}
                            >
                              {c.debtRiskLabel}
                            </span>
                          ) : null}
                        </div>
                        <span className="tabular-nums shrink-0 text-rose-800 font-bold">
                          {formatNgn(c.debtNgn)}
                        </span>
                      </div>
                      {c.aging ? (
                        <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
                          0–30: {formatNgn(c.aging.days0_30)} · 31–60: {formatNgn(c.aging.days31_60)} ·
                          61–90: {formatNgn(c.aging.days61_90)} · 90+: {formatNgn(c.aging.days90_plus)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px]">
                        {c.ledgerRoute ? (
                          <Link to={c.ledgerRoute} className="text-teal-800 font-bold hover:underline">
                            Ledger
                          </Link>
                        ) : null}
                        {c.reportsRoute ? (
                          <>
                            {c.ledgerRoute ? ' · ' : null}
                            <Link to={c.reportsRoute} className="text-teal-800 font-bold hover:underline">
                              Reports
                            </Link>
                          </>
                        ) : null}
                      </p>
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

      {reserveModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reserve-policy-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <h2 id="reserve-policy-title" className="text-sm font-black text-[#134e4a] uppercase tracking-wide">
                Configure Reserve Policy
              </h2>
              <button
                type="button"
                onClick={() => setReserveModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            {reserveModalBusy ? (
              <p className="p-6 text-sm text-slate-600">Loading policy…</p>
            ) : (
              <form onSubmit={saveReservePolicy} className="p-5 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Management decision support only. Indicative expansion headroom remains hidden in this
                  phase. Receivables and inventory are excluded by default.
                </p>
                {[
                  ['operatingReserveNgn', 'Operating reserve (₦)', true],
                  ['emergencyReserveNgn', 'Emergency reserve (₦)', true],
                  ['payrollReserveNgn', 'Payroll reserve (₦)', true],
                  ['supplierPaymentReserveNgn', 'Supplier payment reserve (₦)', true],
                  ['stockPurchaseReserveNgn', 'Stock purchase reserve (₦)', true],
                  ['taxStatutoryReserveNgn', 'Tax / statutory reserve (₦)', true],
                ].map(([field, label, required]) => (
                  <label key={field} className="block text-[10px] font-bold uppercase text-slate-500">
                    {label}
                    {required ? <InfoChip>Required</InfoChip> : null}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required={required}
                      value={reserveForm[field]}
                      onChange={(e) =>
                        setReserveForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
                    />
                  </label>
                ))}
                <fieldset className="space-y-2 border border-slate-100 rounded-xl p-3">
                  <legend className="text-[10px] font-black uppercase text-slate-500 px-1">
                    Indicative expansion headroom inclusion
                  </legend>
                  {[
                    ['includeReceivables', 'Include receivables', false],
                    ['includeInventory', 'Include inventory', false],
                    ['includePoCommitments', 'Include PO commitments', true],
                  ].map(([field, label, recommended]) => (
                    <label key={field} className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={Boolean(reserveForm[field])}
                        onChange={(e) =>
                          setReserveForm((f) => ({ ...f, [field]: e.target.checked }))
                        }
                      />
                      {label}
                      {recommended ? <InfoChip>Recommended</InfoChip> : null}
                    </label>
                  ))}
                </fieldset>
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Policy notes
                  <textarea
                    value={reserveForm.policyNotes}
                    onChange={(e) =>
                      setReserveForm((f) => ({ ...f, policyNotes: e.target.value }))
                    }
                    maxLength={2000}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={reserveSaving}
                    className="flex-1 rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-black uppercase text-white hover:bg-[#0f3d3a] disabled:opacity-60"
                  >
                    {reserveSaving ? 'Saving…' : 'Save reserve policy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReserveModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-black uppercase text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </MainPanel>
  );
}
