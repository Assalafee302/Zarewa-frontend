import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  FileText,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  X,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MainPanel } from '../components/layout';
import { formatNgn } from '../Data/mockData';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { useToast } from '../context/ToastContext';
import { useFinanceTrialExceptions } from '../hooks/useFinanceTrialExceptions';
import { FinanceTrialExceptionPanel } from '../components/finance/FinanceTrialExceptionPanel';
import { userMayViewFinanceTrialOversightClient } from '../lib/financeTrialExceptionsAccess';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import CommandCentreIntelligenceTab from '../components/exec/CommandCentreIntelligenceTab';
import { ExecutiveWorkItemReviewModal } from '../components/exec/ExecutiveWorkItemReviewModal';
import { execWorkItemOpensInModal } from '../lib/execWorkItemReview';
import {
  approvalTierChipClass,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../lib/execApprovalTier';

const EXEC_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'finance', label: 'Finance' },
];

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

function approvalTierChip(tier) {
  if (tier === EXEC_APPROVAL_TIER_MD_ONLY) return approvalTierChipClass(tier);
  if (tier === EXEC_APPROVAL_TIER_SHARED) return approvalTierChipClass(tier);
  return 'bg-slate-100 text-slate-700 ring-slate-200';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { show: showToast } = useToast();
  const [periodKey, setPeriodKey] = useState('month');
  const [branchId, setBranchId] = useState('ALL');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState(EMPTY_RESERVE_FORM);
  const [reserveSaving, setReserveSaving] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reserveModalBusy, setReserveModalBusy] = useState(false);
  const [workTrayFilter, setWorkTrayFilter] = useState('all');

  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const roleLabel = roleKey === 'md' ? 'Managing Director' : roleKey === 'ceo' ? 'CEO' : roleKey || 'Executive';
  const canPickBranch = Boolean(ws?.viewAllBranches || data?.actor?.canUseAllBranches);
  const mayFinanceOversight = userMayViewFinanceTrialOversightClient(
    roleKey,
    ws?.session?.user?.permissions
  );
  const mayViewBi = userMayViewManagementReportsClient(roleKey, ws?.session?.user?.permissions);
  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab =
    rawTab === 'intelligence' && mayViewBi
      ? 'intelligence'
      : rawTab === 'finance'
        ? 'finance'
        : 'overview';

  const setActiveTab = (tabId) => {
    if (tabId === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  };
  const trialBranchScope =
    canPickBranch && branchId && branchId !== 'ALL' ? branchId : null;
  const { data: trialData, loading: trialLoading, error: trialError, reload: reloadTrial } =
    useFinanceTrialExceptions({
      branchId: trialBranchScope,
      enabled: mayFinanceOversight && activeTab === 'finance',
    });

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

  const readOnly = Boolean(data?.workTray?.readOnlyForActor ?? data?.actor?.readOnlyExecutiveView);

  const workTrayItems = useMemo(() => data?.workTray?.items || [], [data?.workTray?.items]);
  const workTrayMdOnlyCount = data?.workTray?.summary?.mdOnly ?? 0;
  const workTraySharedCount = data?.workTray?.summary?.shared ?? 0;
  const filteredWorkTrayItems = useMemo(() => {
    if (workTrayFilter === 'md_only') {
      return workTrayItems.filter((row) => row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY);
    }
    if (workTrayFilter === 'shared') {
      return workTrayItems.filter((row) => row.approvalTier === EXEC_APPROVAL_TIER_SHARED);
    }
    return workTrayItems;
  }, [workTrayFilter, workTrayItems]);

  const handleWorkTrayAction = (row) => {
    if (!row) return;
    if (execWorkItemOpensInModal(row.kind, row)) {
      setReviewItem(row);
      return;
    }
    navigate(row.route || '/manager');
  };
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
  const scopeNote = (data?.dataScopeNotes || [])[0]?.message;

  const visibleTabs = EXEC_TABS.filter((t) => {
    if (t.id === 'intelligence') return mayViewBi;
    return true;
  });

  return (
    <MainPanel className="bg-slate-50/50">
      <header className="mb-8 rounded-2xl border border-[#134e4a]/15 bg-gradient-to-br from-[#134e4a] via-[#0f3d3a] to-[#134e4a] text-white shadow-lg overflow-hidden">
        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200/90">
                Zarewa Aluminium &amp; Plastics
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Command Centre</h1>
              <p className="mt-2 text-sm text-teal-50/85 max-w-2xl leading-relaxed">
                Company performance, decisions, and intelligence for executive oversight.
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

      <nav
        className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm"
        aria-label="Command centre sections"
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wide transition-colors ${
              activeTab === t.id
                ? 'bg-[#134e4a] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {err ? (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      {data?.degradedReason ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.degradedReason} — KPIs may be incomplete.
        </p>
      ) : null}

      {scopeNote ? (
        <p className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 leading-relaxed">
          {scopeNote}
        </p>
      ) : null}

      {activeTab === 'overview' ? (
        <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-8">
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
          label="Outstanding Balance"
          value={formatNgn(kpis.outstandingReceivablesNgn ?? 0)}
          sub="Customer receivables"
          icon={<AlertTriangle size={12} />}
          loading={busy && !data}
          accent="gold"
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

      {mayViewBi ? (
        <p className="mb-6 text-xs text-slate-600">
          Stock forecasts, expense trends, and coil actions are on the{' '}
          <button
            type="button"
            onClick={() => setActiveTab('intelligence')}
            className="font-bold text-[#134e4a] hover:underline"
          >
            Intelligence
          </button>{' '}
          tab.
        </p>
      ) : null}

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
                    a.route === '/analytics' ||
                    String(a.route).startsWith('/analytics') ||
                    String(a.route).includes('tab=intelligence') ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('intelligence')}
                        className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#134e4a] hover:underline"
                      >
                        View detail <ArrowRight size={12} />
                      </button>
                    ) : (
                    <Link
                      to={a.route}
                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#134e4a] hover:underline"
                    >
                      View detail <ArrowRight size={12} />
                    </Link>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>

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

        <Section
          title="Executive Work Tray"
          subtitle={
            readOnly
              ? 'Summary and read-only items — open routes to review detail.'
              : 'MD-only items are listed first. Branch Manager and finance can handle shared queue items without you.'
          }
          icon={<Shield size={18} className="text-[#134e4a]" />}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkTrayFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ring-1 ${
                workTrayFilter === 'all'
                  ? 'bg-[#134e4a] text-white ring-[#134e4a]'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({workTrayMdOnlyCount + workTraySharedCount})
            </button>
            <button
              type="button"
              onClick={() => setWorkTrayFilter('md_only')}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ring-1 ${
                workTrayFilter === 'md_only'
                  ? 'bg-violet-700 text-white ring-violet-700'
                  : `${approvalTierChip(EXEC_APPROVAL_TIER_MD_ONLY)} hover:opacity-90`
              }`}
            >
              MD only ({workTrayMdOnlyCount})
            </button>
            <button
              type="button"
              onClick={() => setWorkTrayFilter('shared')}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ring-1 ${
                workTrayFilter === 'shared'
                  ? 'bg-sky-700 text-white ring-sky-700'
                  : `${approvalTierChip(EXEC_APPROVAL_TIER_SHARED)} hover:opacity-90`
              }`}
            >
              BM / Finance ({workTraySharedCount})
            </button>
            {workTrayMdOnlyCount > 0 ? (
              <p className="text-[10px] text-violet-900 font-semibold ml-1">
                {workTrayMdOnlyCount} item{workTrayMdOnlyCount === 1 ? '' : 's'} need your sign-off only.
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[880px]">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                  <th className="py-2 text-left">Priority</th>
                  <th className="py-2 text-left">Approver</th>
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
                {filteredWorkTrayItems.length === 0 && !busy ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      {workTrayFilter === 'all'
                        ? 'No pending executive items.'
                        : 'No items in this queue.'}
                    </td>
                  </tr>
                ) : (
                  filteredWorkTrayItems.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 ${
                        row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY ? 'bg-violet-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${priorityChip(row.priority)}`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${approvalTierChip(row.approvalTier)}`}
                          title={row.approvalTierReason || row.approvalTierLabel || ''}
                        >
                          {row.approvalTierLabel || (row.approvalTier === EXEC_APPROVAL_TIER_MD_ONLY ? 'MD only' : 'Shared')}
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
                          onClick={() => handleWorkTrayAction(row)}
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

        <p className="text-[10px] text-slate-400 text-center pb-8">
          Generated {data?.generatedAtISO ? new Date(data.generatedAtISO).toLocaleString() : '—'}
          {data?.period ? ` · ${data.period.startISO} – ${data.period.endISO}` : ''}
        </p>
      </div>
        </>
      ) : null}

      {activeTab === 'intelligence' && mayViewBi ? (
        <CommandCentreIntelligenceTab
          branchId={canPickBranch && branchId ? branchId : null}
        />
      ) : null}

      {activeTab === 'finance' ? (
        <div className="space-y-8 pb-12">
          {!mayFinanceOversight ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Accounting trial oversight panel is limited to finance oversight roles. Cash, working capital,
              and payables below use executive dashboard data for the selected period and branch.
            </p>
          ) : null}
          {mayFinanceOversight ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <FinanceTrialExceptionPanel
                variant="oversight"
                data={trialData}
                loading={trialLoading}
                error={trialError}
                onReload={reloadTrial}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Section
              title="Cash & Treasury"
              subtitle="Estimated cash pressure — not a safe-withdrawal calculation."
              icon={<Wallet size={18} className="text-teal-600" />}
            >
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Cash / bank', val: data?.cash?.cashNgn },
                  { label: 'Receivables', val: data?.cash?.receivablesNgn },
                  { label: 'Inventory', val: data?.cash?.inventoryValueNgn, estimated: true },
                  { label: 'Pending outflows', val: data?.cash?.pendingOutflowsNgn },
                ].map(({ label, val, estimated }) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                      {label}
                      {estimated ? <EstChip /> : null}
                    </dt>
                    <dd className="mt-1 font-black tabular-nums text-[#134e4a]">{formatNgn(val ?? 0)}</dd>
                  </div>
                ))}
              </dl>
              {(data?.cash?.horizons || []).length ? (
                <div className="mt-4 flex flex-wrap gap-2">
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
              ) : null}
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
            </Section>
          </div>

          <Section
            title="Working Capital Snapshot"
            subtitle={data?.workingCapital?.label || 'Estimated — not statutory accounts'}
            icon={<Wallet size={18} className="text-teal-600" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WcLinesTable title="Current assets" lines={data?.workingCapital?.currentAssets} />
              <WcLinesTable title="Current liabilities" lines={data?.workingCapital?.currentLiabilities} />
            </div>
            <p className="mt-4 text-sm font-black tabular-nums text-[#134e4a]">
              Est. working capital:{' '}
              {data?.workingCapital?.estimatedWorkingCapitalNgn != null
                ? formatNgn(data.workingCapital.estimatedWorkingCapitalNgn)
                : '—'}
            </p>
          </Section>

          <Section
            title="Reserve Policy"
            subtitle={data?.reservePolicy?.note || 'Management decision support only.'}
            icon={<Shield size={18} className="text-amber-700" />}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <InfoChip>{data?.reservePolicy?.configured ? 'Configured' : 'Not configured'}</InfoChip>
              <span className="text-sm tabular-nums font-bold text-[#134e4a]">
                {data?.reservePolicy?.completionPct ?? 0}% complete
              </span>
              {canManageReservePolicy ? (
                <button
                  type="button"
                  onClick={() => void openReservePolicyModal()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#134e4a]/30 bg-[#134e4a]/5 px-4 py-2 text-[11px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
                >
                  <Settings2 size={16} />
                  Configure
                </button>
              ) : null}
            </div>
            {(data?.reservePolicy?.warnings || []).map((w, i) => (
              <p
                key={i}
                className="mb-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              >
                {w}
              </p>
            ))}
          </Section>
        </div>
      ) : null}

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

      <ExecutiveWorkItemReviewModal
        item={reviewItem}
        isOpen={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onCompleted={load}
        readOnly={readOnly}
      />
    </MainPanel>
  );
}
