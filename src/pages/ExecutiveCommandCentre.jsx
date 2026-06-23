import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  FileText,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MainPanel, PageHeader, PageShell, PageTabs } from '../components/layout';
import { ExecMdAlertStrip } from '../components/exec/ExecMdAlertStrip';
import { EXEC_SELECT, EXEC_SECONDARY_BTN } from '../lib/execPageUi';
import { formatNgn } from '../Data/mockData';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { useToast } from '../context/ToastContext';
import { useFinanceTrialExceptions } from '../hooks/useFinanceTrialExceptions';
import { userMayViewFinanceTrialOversightClient } from '../lib/financeTrialExceptionsAccess';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import CommandCentreIntelligenceTab from '../components/exec/CommandCentreIntelligenceTab';
import { ExecTodayTab } from '../components/exec/ExecTodayTab';
import { ExecDecideTab } from '../components/exec/ExecDecideTab';
import { ExecCustomersTab } from '../components/exec/ExecCustomersTab';
import { ExecTraceTab } from '../components/exec/ExecTraceTab';
import { ExecCustomerSlideOver } from '../components/exec/ExecCustomerSlideOver';
import { ExecMdReviewTab } from '../components/exec/ExecMdReviewTab';
import { ExecMdReviewNav } from '../components/exec/ExecMdReviewNav';
import { ExecFinanceTab } from '../components/exec/ExecFinanceTab';
import { ExpenseCategoryExceptionBanner } from '../components/office/ExpenseCategoryExceptionBanner.jsx';
import { ExpenseCategoryOthersTrendTable } from '../components/office/ExpenseCategoryOthersTrendTable.jsx';
import { downloadExpenseCategoryExceptionsCsv } from '../lib/expenseCategoryExceptionExport.js';
import { ExecutiveWorkItemReviewModal } from '../components/exec/ExecutiveWorkItemReviewModal';
import { execWorkItemOpensInModal } from '../lib/execWorkItemReview';
import {
  getCachedTabPayload,
  invalidateTabPayload,
  setCachedTabPayload,
} from '../lib/execDetailCache';
import {
  approvalTierChipClass,
  EXEC_APPROVAL_TIER_MD_ONLY,
  EXEC_APPROVAL_TIER_SHARED,
} from '../lib/execApprovalTier';

const EXEC_TABS = [
  { id: 'today', label: 'Today', mdOnly: true },
  { id: 'decide', label: 'Decide', mdOnly: true },
  { id: 'customers', label: 'Customers', mdOnly: true },
  { id: 'trace', label: 'Trace', mdOnly: true },
  { id: 'overview', label: 'Review' },
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

const EXEC_TAB_ICONS = {
  today: <Sun size={14} strokeWidth={2} />,
  decide: <ShieldCheck size={14} strokeWidth={2} />,
  customers: <Users size={14} strokeWidth={2} />,
  trace: <Search size={14} strokeWidth={2} />,
  overview: <FileText size={14} strokeWidth={2} />,
  intelligence: <BarChart3 size={14} strokeWidth={2} />,
  finance: <Wallet size={14} strokeWidth={2} />,
};

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
  const [othersTrend, setOthersTrend] = useState(null);
  const [othersTrendBusy, setOthersTrendBusy] = useState(false);
  const [othersTrendErr, setOthersTrendErr] = useState('');
  const [customerIntel, setCustomerIntel] = useState(null);
  const [customerIntelBusy, setCustomerIntelBusy] = useState(false);
  const [customerIntelErr, setCustomerIntelErr] = useState('');
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [tracePack, setTracePack] = useState(null);
  const [traceBusy, setTraceBusy] = useState(false);
  const [traceErr, setTraceErr] = useState('');

  const roleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const roleLabel = roleKey === 'md' ? 'Managing Director' : roleKey === 'ceo' ? 'CEO' : roleKey || 'Executive';
  const isMdCockpit = roleKey === 'md' || roleKey === 'admin';
  const isMdOffice = isMdCockpit && roleKey !== 'ceo';
  const isExecutiveOversight = roleKey === 'md' || roleKey === 'ceo' || roleKey === 'admin';
  const expenseCategoryAlert = ws?.snapshot?.expenseCategoryMonthlyAlert;
  const canPickBranch = Boolean(ws?.viewAllBranches || data?.actor?.canUseAllBranches);
  const mayFinanceOversight = userMayViewFinanceTrialOversightClient(
    roleKey,
    ws?.permissions
  );
  const mayViewBi = userMayViewManagementReportsClient(roleKey, ws?.permissions);
  const rawTab = searchParams.get('tab') || (isMdOffice ? 'today' : 'overview');
  const rawReviewView = String(searchParams.get('view') || '').trim();
  const reviewView =
    rawTab === 'intelligence'
      ? 'intelligence'
      : rawTab === 'finance'
        ? 'finance'
        : rawReviewView === 'intelligence' || rawReviewView === 'finance'
          ? rawReviewView
          : 'pack';
  const activeTab =
    rawTab === 'today' && isMdCockpit
      ? 'today'
      : rawTab === 'decide' && isMdCockpit
        ? 'decide'
        : rawTab === 'customers' && isMdCockpit
          ? 'customers'
          : rawTab === 'trace' && isMdCockpit
            ? 'trace'
            : rawTab === 'intelligence' && mayViewBi && !isMdOffice
              ? 'intelligence'
              : rawTab === 'intelligence' && isMdOffice
                ? 'overview'
                : rawTab === 'finance' && !isMdOffice
                  ? 'finance'
                  : rawTab === 'finance' && isMdOffice
                    ? 'overview'
                    : rawTab === 'overview' || (isMdOffice && (rawTab === 'intelligence' || rawTab === 'finance'))
                      ? 'overview'
                      : rawTab === 'intelligence' && mayViewBi
                        ? 'intelligence'
                        : rawTab === 'finance'
                          ? 'finance'
                          : isMdOffice
                            ? 'today'
                            : 'overview';

  const setReviewView = useCallback(
    (view) => {
      if (view === 'pack') {
        setSearchParams({ tab: 'overview' });
        return;
      }
      setSearchParams({ tab: 'overview', view });
    },
    [setSearchParams]
  );

  const setActiveTab = (tabId) => {
    if (isMdOffice && (tabId === 'intelligence' || tabId === 'finance')) {
      setReviewView(tabId);
      return;
    }
    if (tabId === 'overview' || (tabId === 'today' && !isMdCockpit)) {
      setSearchParams({});
    } else if (tabId === 'today' && isMdCockpit) {
      setSearchParams({ tab: 'today' });
    } else {
      setSearchParams({ tab: tabId });
    }
  };
  const trialBranchScope =
    canPickBranch && branchId && branchId !== 'ALL' ? branchId : null;
  const showFinancePanel = activeTab === 'finance' && !isMdOffice;
  const showIntelligencePanel = mayViewBi && activeTab === 'intelligence' && !isMdOffice;
  const showMdFinanceReview = isMdOffice && activeTab === 'overview' && reviewView === 'finance';
  const showMdIntelligenceReview =
    isMdOffice && activeTab === 'overview' && reviewView === 'intelligence' && mayViewBi;
  const financePanelActive = showFinancePanel || showMdFinanceReview;
  const { data: trialData, loading: trialLoading, error: trialError, reload: reloadTrial } =
    useFinanceTrialExceptions({
      branchId: trialBranchScope,
      enabled: mayFinanceOversight && financePanelActive,
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

  const loadCustomerIntel = useCallback(async (force = false) => {
    const cacheKey = `customers|${periodKey}|${branchId}`;
    if (!force) {
      const cached = getCachedTabPayload(cacheKey);
      if (cached) {
        setCustomerIntel(cached);
        setCustomerIntelErr('');
        return;
      }
    }
    setCustomerIntelBusy(true);
    setCustomerIntelErr('');
    const qs = new URLSearchParams({ periodKey });
    if (canPickBranch && branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    else if (canPickBranch && branchId === 'ALL') qs.set('branchId', 'ALL');
    const { ok, data: d } = await apiFetch(`/api/exec/customers?${qs.toString()}`);
    setCustomerIntelBusy(false);
    if (!ok || !d?.ok) {
      setCustomerIntel(null);
      setCustomerIntelErr(d?.error || 'Could not load customer intelligence.');
      return;
    }
    setCachedTabPayload(cacheKey, d);
    setCustomerIntel(d);
  }, [periodKey, branchId, canPickBranch]);

  const loadTrace = useCallback(
    async (shuffle = false) => {
      const cacheKey = `trace|${branchId}`;
      if (!shuffle) {
        const cached = getCachedTabPayload(cacheKey);
        if (cached) {
          setTracePack(cached);
          setTraceErr('');
          return;
        }
      }
      setTraceBusy(true);
      setTraceErr('');
      const qs = new URLSearchParams();
      if (canPickBranch && branchId && branchId !== 'ALL') qs.set('branchId', branchId);
      else if (canPickBranch && branchId === 'ALL') qs.set('branchId', 'ALL');
      if (shuffle) qs.set('shuffle', '1');
      const { ok, data: d } = await apiFetch(`/api/exec/trace?${qs.toString()}`);
      setTraceBusy(false);
      if (!ok || !d?.ok) {
        setTracePack(null);
        setTraceErr(d?.error || 'Could not load MD trace.');
        return;
      }
      if (!shuffle) setCachedTabPayload(cacheKey, d);
      else invalidateTabPayload(cacheKey);
      setTracePack(d);
    },
    [branchId, canPickBranch]
  );

  useEffect(() => {
    if (activeTab === 'customers' && isMdCockpit) void loadCustomerIntel();
  }, [activeTab, isMdCockpit, loadCustomerIntel]);

  useEffect(() => {
    if (activeTab === 'trace' && isMdCockpit) void loadTrace(false);
  }, [activeTab, isMdCockpit, loadTrace]);

  const handleTraceOpenRef = useCallback(
    (domain, docRef) => {
      const ref = String(docRef || '').trim();
      if (!ref) return;
      if (domain === 'sales' || domain === 'collections' || domain === 'governance') {
        navigate(`/sales?quotation=${encodeURIComponent(ref)}`);
        return;
      }
      if (domain === 'procurement') {
        navigate('/procurement');
        return;
      }
      if (domain === 'operations') {
        navigate('/operations');
        return;
      }
      if (domain === 'finance') {
        navigate('/accounts');
        return;
      }
      showToast(`Reference: ${ref}`, { variant: 'info' });
    },
    [navigate, showToast]
  );

  const loadOthersTrend = useCallback(async () => {
    const onFinance = financePanelActive;
    const onOverview = activeTab === 'overview' && isExecutiveOversight && !isMdOffice;
    if (!onFinance && !onOverview) return;
    setOthersTrendBusy(true);
    setOthersTrendErr('');
    const qs = new URLSearchParams({ months: '6' });
    if (canPickBranch && branchId && branchId !== 'ALL') qs.set('branchScope', branchId);
    else qs.set('branchScope', 'ALL');
    const { ok, data: d } = await apiFetch(`/api/reports/expense-category-others-trend?${qs.toString()}`);
    setOthersTrendBusy(false);
    if (!ok || !d?.ok) {
      setOthersTrend(null);
      setOthersTrendErr(d?.error || 'Could not load Others trend.');
      return;
    }
    setOthersTrend(d);
  }, [activeTab, branchId, canPickBranch, financePanelActive, isExecutiveOversight, isMdOffice]);

  useEffect(() => {
    if (!financePanelActive && !(activeTab === 'overview' && isExecutiveOversight && !isMdOffice)) return;
    void loadOthersTrend();
  }, [activeTab, financePanelActive, isExecutiveOversight, isMdOffice, loadOthersTrend]);

  const branchTrendLabel = useCallback(
    (id) => BRANCH_OPTIONS.find((b) => b.id === id)?.label || id,
    []
  );

  const exportCategoryExceptionsCsv = useCallback(async () => {
    try {
      await downloadExpenseCategoryExceptionsCsv({
        viewAllBranches: ws?.viewAllBranches,
        branchScope: ws?.branchScope,
      });
    } catch {
      showToast('Could not export category exceptions.', { variant: 'error' });
    }
  }, [showToast, ws?.branchScope, ws?.viewAllBranches]);

  const renderOthersTrendBody = (compact = false) => {
    if (othersTrendErr) {
      return (
        <p className={`rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 ${compact ? 'text-xs' : 'text-sm'} text-rose-800`}>
          {othersTrendErr}
        </p>
      );
    }
    if (othersTrendBusy && !othersTrend) {
      return <p className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>Loading trend…</p>;
    }
    if ((othersTrend?.branches || []).length === 0) {
      return (
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>
          No approved payment requests in the selected window.
        </p>
      );
    }
    return (
      <ExpenseCategoryOthersTrendTable
        trend={othersTrend}
        branchLabel={branchTrendLabel}
        compact={compact}
      />
    );
  };

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
    if (isMdOffice && (t.id === 'intelligence' || t.id === 'finance')) return false;
    if (t.mdOnly && !isMdCockpit) return false;
    if (t.mdOnly && roleKey === 'ceo') return false;
    if (t.id === 'intelligence') return mayViewBi;
    return true;
  });

  const pageTabs = visibleTabs.map((t) => ({
    id: t.id,
    label:
      t.id === 'decide' && workTrayMdOnlyCount > 0
        ? `Decide (${workTrayMdOnlyCount})`
        : t.label,
    icon: EXEC_TAB_ICONS[t.id] ?? null,
  }));

  const pageSubtitle = [
    roleKey === 'md'
      ? 'Decisions, approvals, and company performance — act here without opening other departments.'
      : 'Company performance, decisions, and intelligence for executive oversight.',
    periodWindow ? `Window: ${periodWindow}` : null,
    branchScopeLabel ? `Scope: ${branchScopeLabel}` : null,
    data?.generatedAtISO ? `Updated ${formatLastUpdated(data.generatedAtISO)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <MainPanel>
      <PageShell>
        <PageHeader
          eyebrow="Zarewa Aluminium & Plastics"
          title={roleKey === 'md' ? 'MD Office' : 'Command Centre'}
          subtitle={pageSubtitle}
          tabs={
            <PageTabs
              tabs={pageTabs}
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel="Command centre sections"
            />
          }
          toolbar={
            <>
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className={EXEC_SELECT}
                aria-label="Period"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              {canPickBranch ? (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className={EXEC_SELECT}
                  aria-label="Branch"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <span className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase text-slate-600">
                {roleLabel}
              </span>
              {readOnly ? (
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase text-amber-900">
                  Read-only
                </span>
              ) : null}
              {data?.degraded ? (
                <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold uppercase text-rose-900">
                  Partial data
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                disabled={busy}
                className={`${EXEC_SECONDARY_BTN} disabled:opacity-50`}
              >
                <RefreshCw size={14} strokeWidth={2} className={busy ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button type="button" onClick={() => navigate('/reports')} className={EXEC_SECONDARY_BTN}>
                <FileText size={14} strokeWidth={2} />
                Reports
              </button>
            </>
          }
        />

        {isMdCockpit ? (
          <ExecMdAlertStrip
            mdOnlyCount={workTrayMdOnlyCount}
            activeTab={activeTab}
            onOpenDecide={() => setActiveTab('decide')}
          />
        ) : null}

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

      {activeTab === 'today' && isMdCockpit ? (
        <ExecTodayTab
          data={data}
          busy={busy}
          readOnly={readOnly}
          formatNgn={formatNgn}
          filteredWorkTrayItems={filteredWorkTrayItems.filter((row) => !row.summaryOnly)}
          onReview={handleWorkTrayAction}
          onOpenDecide={() => setActiveTab('decide')}
        />
      ) : null}

      {activeTab === 'decide' && isMdCockpit ? (
        <ExecDecideTab
          data={data}
          busy={busy}
          readOnly={readOnly}
          formatNgn={formatNgn}
          filteredWorkTrayItems={filteredWorkTrayItems.filter((row) => !row.summaryOnly)}
          workTrayFilter={workTrayFilter}
          onWorkTrayFilterChange={setWorkTrayFilter}
          mdOnlyCount={workTrayMdOnlyCount}
          sharedCount={workTraySharedCount}
          onReview={handleWorkTrayAction}
        />
      ) : null}

      {activeTab === 'customers' && isMdCockpit ? (
        <ExecCustomersTab
          data={customerIntel}
          busy={customerIntelBusy}
          err={customerIntelErr}
          formatNgn={formatNgn}
          segmentFilter={customerSegmentFilter}
          onSegmentFilterChange={setCustomerSegmentFilter}
          onReload={() => void loadCustomerIntel(true)}
          onSelectCustomer={setSelectedCustomer}
        />
      ) : null}

      {activeTab === 'trace' && isMdCockpit ? (
        <ExecTraceTab
          data={tracePack}
          busy={traceBusy}
          err={traceErr}
          formatNgn={formatNgn}
          onReload={() => void loadTrace(false)}
          onShuffle={() => void loadTrace(true)}
          onOpenRef={handleTraceOpenRef}
        />
      ) : null}

      {activeTab === 'overview' && isMdOffice ? (
        <div className="space-y-6 pb-10">
          <ExecMdReviewNav
            value={reviewView}
            onChange={setReviewView}
            mayViewBi={mayViewBi}
          />
          {reviewView === 'pack' ? (
            <ExecMdReviewTab
              data={data}
              busy={busy}
              readOnly={readOnly}
              formatNgn={formatNgn}
              branchScopeLabel={
                branchId === 'ALL' || !branchId
                  ? 'Company-wide'
                  : BRANCH_OPTIONS.find((b) => b.id === branchId)?.label || branchId
              }
              payrollItems={workTrayItems.filter(
                (row) => String(row.kind || '').toLowerCase() === 'payroll' && !row.summaryOnly
              )}
              onReview={handleWorkTrayAction}
              onOpenDecide={() => setActiveTab('decide')}
              onOpenCustomers={() => setActiveTab('customers')}
              onOpenTrace={() => setActiveTab('trace')}
              onOpenDeepDive={setReviewView}
            />
          ) : null}
          {showMdIntelligenceReview ? (
            <CommandCentreIntelligenceTab branchId={canPickBranch && branchId ? branchId : null} />
          ) : null}
          {showMdFinanceReview ? (
            <ExecFinanceTab
              data={data}
              formatNgn={formatNgn}
              branchId={branchId}
              branchScopeLabel={
                branchId === 'ALL' || !branchId
                  ? 'Company-wide'
                  : BRANCH_OPTIONS.find((b) => b.id === branchId)?.label || branchId
              }
              ws={ws}
              canPickBranch={canPickBranch}
              mayFinanceOversight={mayFinanceOversight}
              trialData={trialData}
              trialLoading={trialLoading}
              trialError={trialError}
              reloadTrial={reloadTrial}
              othersTrend={othersTrend}
              othersTrendBusy={othersTrendBusy}
              othersTrendErr={othersTrendErr}
              onReloadOthersTrend={loadOthersTrend}
              canManageReservePolicy={canManageReservePolicy}
              onConfigureReserve={openReservePolicyModal}
              branchTrendLabel={branchTrendLabel}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'overview' && !isMdOffice ? (
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

      {isExecutiveOversight && expenseCategoryAlert?.shouldAlert ? (
        <div className="mb-6 space-y-2">
          <ExpenseCategoryExceptionBanner
            summary={expenseCategoryAlert}
            formatNgn={formatNgn}
            onExportCsv={() => void exportCategoryExceptionsCsv()}
          />
          <Link
            to="/accounts"
            state={{ accountsTab: 'disbursements' }}
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-amber-900 hover:underline ml-1"
          >
            Open Finance exceptions <ArrowRight size={12} />
          </Link>
        </div>
      ) : null}

      {isExecutiveOversight ? (
        <Section
          title="Others spend trend"
          subtitle="Approved payment requests coded Others — rolling 6 months"
          icon={<BarChart3 size={18} className="text-amber-700" />}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-xs text-slate-600">
              Company share:{' '}
              <span className="font-bold tabular-nums text-[#134e4a]">
                {othersTrend?.summary?.othersPct != null ? `${othersTrend.summary.othersPct}%` : '—'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="text-[10px] font-bold uppercase text-[#134e4a] hover:underline"
            >
              Full finance view
            </button>
          </div>
          {renderOthersTrendBody(true)}
        </Section>
      ) : null}

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

        {roleKey !== 'md' ? (
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
        ) : (
          <p className="mb-6 rounded-xl border border-teal-200/80 bg-teal-50/40 px-4 py-3 text-sm text-[#134e4a]">
            Approvals and reviews are on the{' '}
            <button type="button" onClick={() => setActiveTab('decide')} className="font-bold underline">
              Decide
            </button>{' '}
            tab — no need to open Sales, Finance, or HR separately.
          </p>
        )}

        <p className="text-[10px] text-slate-400 text-center pb-8">
          Generated {data?.generatedAtISO ? new Date(data.generatedAtISO).toLocaleString() : '—'}
          {data?.period ? ` · ${data.period.startISO} – ${data.period.endISO}` : ''}
        </p>
      </div>
        </>
      ) : null}

      {showIntelligencePanel ? (
        <CommandCentreIntelligenceTab
          branchId={canPickBranch && branchId ? branchId : null}
        />
      ) : null}

      {showFinancePanel ? (
        <ExecFinanceTab
          data={data}
          formatNgn={formatNgn}
          branchId={branchId}
          branchScopeLabel={
            branchId === 'ALL' || !branchId
              ? 'Company-wide'
              : BRANCH_OPTIONS.find((b) => b.id === branchId)?.label || branchId
          }
          ws={ws}
          canPickBranch={canPickBranch}
          mayFinanceOversight={mayFinanceOversight}
          trialData={trialData}
          trialLoading={trialLoading}
          trialError={trialError}
          reloadTrial={reloadTrial}
          othersTrend={othersTrend}
          othersTrendBusy={othersTrendBusy}
          othersTrendErr={othersTrendErr}
          onReloadOthersTrend={loadOthersTrend}
          canManageReservePolicy={canManageReservePolicy}
          onConfigureReserve={openReservePolicyModal}
          branchTrendLabel={branchTrendLabel}
        />
      ) : null}

      </PageShell>

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

      <ExecCustomerSlideOver
        customer={selectedCustomer}
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
      />
    </MainPanel>
  );
}
