import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  Flag,
  RotateCcw,
  Search,
  ChevronRight,
  DollarSign,
  Zap,
  RefreshCw,
  BarChart3,
  FileText,
  Factory,
  LayoutDashboard,
  AlertTriangle,
  Radio,
  Printer,
  Paperclip,
  HelpCircle,
  Package,
  ClipboardList,
  PencilLine,
  Unlock,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { printExpenseRequestRecord } from '../lib/expenseRequestPrint';
import { useWorkspace } from '../context/WorkspaceContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { formatNgn } from '../Data/mockData';
import { effectiveManagerTargetsPerMonth, mergeDashboardPrefs } from '../lib/dashboardPrefs';
import { userCanApproveEditMutationsClient } from '../lib/editApprovalUi';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { buildPaymentRequestBodyFromForm, initialExpenseRequestFormState } from '../lib/expenseRequestFormCore.js';
import {
  canSeeExecutiveInventoryEditShortcut,
  canSeeExecutiveProductionEditShortcut,
} from '../lib/executiveStoreToolsAccess';
import { EditSecondApprovalInline } from '../components/EditSecondApprovalInline';
import { ZareApprovalHint } from '../components/ZareApprovalHint';
import {
  buildManagementQueuesFromSnapshot,
  buildManagerSnapshotsFromWorkspace,
  MANAGER_METRIC_PERIODS,
  managementPeriodStartISO,
} from '../lib/managementLiveFromWorkspace';
import {
  MANAGER_ATTENTION_FILTERS,
  MANAGER_INBOX_TABS,
  buildCashOutInboxRows,
  buildOrdersInboxRows,
  filterAttentionItems,
  formatRefundReasonCategory,
  matchesInboxSearch,
  normalizeManagerInboxRoute,
} from '../lib/managerDashboardCore';
import { isEffectivelyFullyPaid } from '../lib/paymentOutstandingTolerance';
import { formatPersonName } from '../lib/formatPersonName';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { Card, Button } from '../components/ui';
import { ModalFrame, PageShell } from '../components/layout';
import { DashboardKpiStrip } from '../components/dashboard/DashboardKpiStrip';
import { ManagementAuditSections } from '../components/management/ManagementAuditSections';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal';
import { ManagerPoAuditSections } from '../components/management/ManagerPoAuditSections';
import { RefundManagerApprovalPreview } from '../components/management/RefundManagerApprovalPreview';
import { OperationalSummaryWidget } from '../components/reports/OperationalSummaryWidget';
import { ClearanceManagerApprovalPreview } from '../components/management/ClearanceManagerApprovalPreview';
import { OfficialRecordBanner } from '../components/management/OfficialRecordBanner';
import DeliveryGateDiagnosticsBanner from '../components/finance/DeliveryGateDiagnosticsBanner';
import { syncAccountingPolicyFlagsFromHealth, deliveryPaymentGateMode } from '../lib/accountingPolicyFlags';
import { userMayApproveRefundRequests } from '../lib/refundsStore';
import { canApproveProductionGate, productionGateOverrideDeniedMessage, productionGateOverrideNoteValid } from '../lib/productionGateAccess';
import {
  userMayPerformManagerQuotationClearance,
  userMayReleaseQuotationPaymentHold,
} from '../lib/workspaceGovernanceClient';
import { CreditExceptionPanel } from '../components/finance/CreditExceptionPanel';
import { useCreditExceptions } from '../hooks/useCreditExceptions';
import { HrDailyRollPanel } from '../components/hr/HrDailyRollPanel';
import { canMarkHrAttendance } from '../lib/hrAccess';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteDeepLinked = useRef('');
  const poDeepLinked = useRef('');
  const refundDeepLinked = useRef('');
  const jobDeepLinked = useRef('');
  const requestDeepLinked = useRef('');
  const managerQueuesHydratedRef = useRef(false);
  const lastRefundIntelQrefRef = useRef('');
  const ws = useWorkspace();
  const showAttendanceTab = canMarkHrAttendance(ws?.permissions);
  const managerRoleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const showDeliveryCreditTab = ['md', 'admin', 'sales_manager', 'finance_manager'].includes(managerRoleKey);
  const managerInboxTabs = useMemo(
    () =>
      MANAGER_INBOX_TABS.filter((t) => t.key !== 'attendance' || showAttendanceTab).filter(
        (t) => t.key !== 'credit' || showDeliveryCreditTab
      ),
    [showAttendanceTab, showDeliveryCreditTab]
  );
  const { show: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [stockRegisterMgrOpen, setStockRegisterMgrOpen] = useState(false);
  const [stockRegisterInbox, setStockRegisterInbox] = useState([]);
  const [items, setItems] = useState({
    pendingClearance: [],
    flagged: [],
    productionOverrides: [],
    pendingRefunds: [],
    pendingExpenses: [],
    pendingConversionReviews: [],
    pendingMaterialIncidents: [],
  });
  /** @type {[null | { kind: string; quoteId?: string; refundId?: string; requestId?: string; jobId?: string; row: object; cuttingListId?: string; fromProductionGate?: boolean }, Function]} */
  const [selectedIntel, setSelectedIntel] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [refundIntelExtras, setRefundIntelExtras] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingRefundIntel, setLoadingRefundIntel] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const [activeTab, setActiveTab] = useState('attention');
  const [attentionFilter, setAttentionFilter] = useState('all');
  const [attentionItems, setAttentionItems] = useState([]);
  const [, setAttentionSummary] = useState(null);
  const [poAuditData, setPoAuditData] = useState(null);
  const [loadingPoAudit, setLoadingPoAudit] = useState(false);
  const [deliveryGateMode, setDeliveryGateMode] = useState('off');
  const [editApprovalPending, setEditApprovalPending] = useState([]);
  const [conversionSignoffRemark, setConversionSignoffRemark] = useState('');
  const [conversionSignoffEditApprovalId, setConversionSignoffEditApprovalId] = useState('');
  const [showExpenseCorrectionModal, setShowExpenseCorrectionModal] = useState(false);
  const [savingExpenseCorrection, setSavingExpenseCorrection] = useState(false);
  const [editingPaymentRequestId, setEditingPaymentRequestId] = useState('');
  const [expenseCorrectionForm, setExpenseCorrectionForm] = useState(() => initialExpenseRequestFormState());
  const payRequestFileRef = useRef(null);
  /** @type {['month' | '4months' | 'half' | 'year', Function]} */
  const [metricPeriod, setMetricPeriod] = useState('month');

  const showExecProdShortcut = useMemo(
    () => canSeeExecutiveProductionEditShortcut(ws?.session?.user?.roleKey, ws?.permissions),
    [ws?.session?.user?.roleKey, ws?.permissions]
  );
  const showExecInvShortcut = useMemo(
    () => canSeeExecutiveInventoryEditShortcut(ws?.session?.user?.roleKey, ws?.permissions),
    [ws?.session?.user?.roleKey, ws?.permissions]
  );
  const canExecInvOpenAdjust = Boolean(ws?.hasPermission?.('inventory.adjust'));
  const showBiShortcut = useMemo(
    () => userMayViewManagementReportsClient(ws?.session?.user?.roleKey, ws?.permissions),
    [ws?.session?.user?.roleKey, ws?.permissions]
  );
  const canApprovePaymentRequests =
    Boolean(ws?.hasPermission?.('finance.approve')) || Boolean(ws?.hasPermission?.('*'));
  const canManagerClearance = userMayPerformManagerQuotationClearance(ws?.session?.user);
  const canReleasePaymentHolds = userMayReleaseQuotationPaymentHold(ws?.session?.user);
  const canApproveRefunds = userMayApproveRefundRequests(ws);
  const { items: creditExceptionItems } = useCreditExceptions({
    branchId: ws?.workspaceBranchId || ws?.session?.branchId || null,
    enabled: showDeliveryCreditTab,
  });
  const pendingCreditCount = useMemo(
    () => creditExceptionItems.filter((i) => i.status === 'pending').length,
    [creditExceptionItems]
  );

  const selectedRefundRecord = useMemo(() => {
    if (selectedIntel?.kind !== 'refund' || !selectedIntel.refundId) return null;
    const list = ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : [];
    return list.find((r) => String(r.refundID) === String(selectedIntel.refundId)) || null;
  }, [selectedIntel?.kind, selectedIntel?.refundId, ws?.hasWorkspaceData, ws?.snapshot?.refunds]);

  const intelModalLight =
    selectedIntel?.kind === 'refund' ||
    selectedIntel?.kind === 'quotation' ||
    selectedIntel?.kind === 'purchase_order';
  const intelModalTitle =
    selectedIntel?.kind === 'refund'
      ? 'Refund approval review'
      : selectedIntel?.kind === 'quotation'
        ? selectedIntel.reviewContext === 'flagged'
          ? 'Flagged quotation review'
          : selectedIntel.reviewContext === 'production'
            ? 'Production gate review'
            : 'Clearance review'
        : selectedIntel?.kind === 'purchase_order'
          ? 'Purchase order lifecycle'
          : 'Transaction intel';

  const displayItems = useMemo(() => {
    if (ws?.hasWorkspaceData && ws.snapshot) {
      return buildManagementQueuesFromSnapshot(ws.snapshot);
    }
    return items;
  }, [ws?.hasWorkspaceData, ws.snapshot, items]);

  const ordersInboxRows = useMemo(() => buildOrdersInboxRows(displayItems), [displayItems]);
  const cashOutInboxRows = useMemo(() => buildCashOutInboxRows(displayItems), [displayItems]);

  const unifiedWorkItems = useMemo(
    () => (Array.isArray(ws?.snapshot?.unifiedWorkItems) ? ws.snapshot.unifiedWorkItems : []),
    [ws?.snapshot?.unifiedWorkItems]
  );
  const unifiedBySource = useMemo(() => {
    const out = new Map();
    for (const item of unifiedWorkItems) {
      const key = `${String(item.sourceKind || '').trim()}:${String(item.sourceId || '').trim()}`;
      if (!key || key === ':') continue;
      out.set(key, item);
    }
    return out;
  }, [unifiedWorkItems]);
  const openUnifiedWorkItem = useCallback(
    (item) => {
      if (selectedIntel?.kind === 'payment') {
        const requestId = String(selectedIntel.requestId || '').trim();
        const lineItems = Array.isArray(selectedIntel?.row?.line_items) ? selectedIntel.row.line_items : [];
        const lines =
          lineItems.length > 0
            ? lineItems.map((ln, idx) => ({
                id: `line-${idx + 1}`,
                item: String(ln?.item || ''),
                unit: String(ln?.unit ?? ''),
                unitPriceNgn: String(ln?.unitPriceNgn ?? ln?.unit_price_ngn ?? ''),
              }))
            : initialExpenseRequestFormState().lines;
        const requestDate = String(selectedIntel?.row?.request_date || '').slice(0, 10);
        setExpenseCorrectionForm({
          ...initialExpenseRequestFormState(),
          lines,
          date: requestDate || new Date().toISOString().slice(0, 10),
          requestDate: requestDate || new Date().toISOString().slice(0, 10),
          requestReference: String(selectedIntel?.row?.request_reference || requestId || '').trim(),
          expenseCategory: String(selectedIntel?.row?.expense_category || '').trim(),
          description: String(selectedIntel?.row?.description || '').trim() || '—',
          attachment: null,
        });
        setEditingPaymentRequestId(requestId);
        if (payRequestFileRef.current) payRequestFileRef.current.value = '';
        setShowExpenseCorrectionModal(true);
        return;
      }
      if (!item?.routePath) return;
      navigate(item.routePath, item.routeState ? { state: item.routeState } : undefined);
    },
    [navigate, selectedIntel]
  );
  const selectedUnifiedWorkItem = useMemo(() => {
    if (!selectedIntel) return null;
    if (selectedIntel.kind === 'quotation') {
      if (selectedIntel.fromProductionGate) {
        return (
          unifiedBySource.get(`production_gate:${String(selectedIntel.quoteId || '').trim()}`) ||
          unifiedBySource.get(`quotation_clearance:${String(selectedIntel.quoteId || '').trim()}`) ||
          null
        );
      }
      return (
        unifiedBySource.get(`flagged_transaction:${String(selectedIntel.quoteId || '').trim()}`) ||
        unifiedBySource.get(`quotation_clearance:${String(selectedIntel.quoteId || '').trim()}`) ||
        null
      );
    }
    if (selectedIntel.kind === 'refund') {
      return unifiedBySource.get(`refund_request:${String(selectedIntel.refundId || '').trim()}`) || null;
    }
    if (selectedIntel.kind === 'payment') {
      return unifiedBySource.get(`payment_request:${String(selectedIntel.requestId || '').trim()}`) || null;
    }
    if (selectedIntel.kind === 'conversion') {
      return unifiedBySource.get(`conversion_review:${String(selectedIntel.jobId || '').trim()}`) || null;
    }
    return null;
  }, [selectedIntel, unifiedBySource]);
  const officialRecordFallbackId = useMemo(() => {
    if (!selectedIntel) return '';
    if (selectedIntel.kind === 'quotation') return String(selectedIntel.quoteId || '').trim();
    if (selectedIntel.kind === 'refund') return String(selectedIntel.row?.quotation_ref || '').trim();
    return '';
  }, [selectedIntel]);

  const paymentIntelLineItems = useMemo(() => {
    const raw = selectedIntel?.row?.line_items;
    if (!Array.isArray(raw)) return { lines: [], total: 0 };
    return { lines: raw.slice(0, 20), total: raw.length };
  }, [selectedIntel?.row?.line_items]);
  const saveExpenseCorrection = async (e) => {
    e.preventDefault();
    if (savingExpenseCorrection) return;
    if (!editingPaymentRequestId) {
      showToast('No payment request selected for editing.', { variant: 'error' });
      return;
    }
    const body = buildPaymentRequestBodyFromForm(expenseCorrectionForm);
    if (!String(body.expenseCategory || '').trim()) {
      showToast('Select an expense category from the list.', { variant: 'error' });
      return;
    }
    if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      showToast('Add at least one line with description, quantity, and unit price.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Connect to the API to edit payment requests.', { variant: 'info' });
      return;
    }
    setSavingExpenseCorrection(true);
    try {
      const { ok, data } = await apiFetch(
        `/api/payment-requests/${encodeURIComponent(editingPaymentRequestId)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not update payment request.', { variant: 'error' });
        return;
      }
      await ws.refresh();
      showToast('Payment request updated. Approval resets to Pending for fresh review.');
      setShowExpenseCorrectionModal(false);
      setEditingPaymentRequestId('');
    } finally {
      setSavingExpenseCorrection(false);
    }
  };

  const { products: invProducts } = useInventory();
  const liveLowStockCount = useMemo(
    () => invProducts.filter((p) => p.stockLevel < p.lowStockThreshold).length,
    [invProducts]
  );

  const workspaceQuotations = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.quotations) ? ws.snapshot.quotations : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const workspaceCuttingLists = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const workspaceProductionJobs = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.productionJobs) ? ws.snapshot.productionJobs : [],
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );

  const mergedPrefsForTargets = useMemo(
    () => mergeDashboardPrefs(ws?.snapshot?.dashboardPrefs),
    [ws?.snapshot?.dashboardPrefs]
  );

  const managerTargetsForBuild = useMemo(() => {
    const eff = effectiveManagerTargetsPerMonth(ws?.snapshot?.orgManagerTargets, mergedPrefsForTargets);
    return { nairaTarget: eff.nairaTargetPerMonth, meterTarget: eff.meterTargetPerMonth };
  }, [ws?.snapshot?.orgManagerTargets, mergedPrefsForTargets]);

  /** Which target tier drives progress bars (for hero chip). */
  const managerTargetSourceMeta = useMemo(() => {
    const org = ws?.snapshot?.orgManagerTargets;
    const orgN = Number(org?.nairaTargetPerMonth);
    const orgM = Number(org?.meterTargetPerMonth);
    const hasOrg = (Number.isFinite(orgN) && orgN > 0) || (Number.isFinite(orgM) && orgM > 0);

    if (mergedPrefsForTargets.managerTargetsPersonalOverride) {
      return {
        shortLabel: 'Personal',
        title:
          'Active targets: personal override. Progress bars use your own monthly baselines from Settings → Preferences. Company defaults are ignored.',
        chipClass:
          'bg-violet-500/20 border-violet-400/35 text-violet-100',
      };
    }
    if (hasOrg) {
      return {
        shortLabel: 'Company',
        title:
          'Active targets: company. Progress bars prefer company monthly baselines set by an admin in Settings → Preferences. If only one leg is set at company level, the other uses your saved baseline or the app default.',
        chipClass: 'bg-sky-500/20 border-sky-400/35 text-sky-100',
      };
    }
    return {
      shortLabel: 'Account',
      title:
        'Active targets: your account. No company targets are set; progress bars use the values saved on your account in Settings → Preferences, or built-in defaults.',
      chipClass: 'bg-white/10 border-white/20 text-teal-100/95',
    };
  }, [mergedPrefsForTargets.managerTargetsPersonalOverride, ws?.snapshot?.orgManagerTargets]);

  const materialIncidentQueue = items.pendingMaterialIncidents ?? [];
  const pendingOrderSignOffCount = displayItems.pendingClearance?.length ?? 0;

  const displaySnapshots = useMemo(() => {
    const periodMeta = MANAGER_METRIC_PERIODS.find((p) => p.key === metricPeriod);
    const monthsSpan = periodMeta?.monthsSpan ?? 1;
    const scaledTargets = {
      nairaTarget: managerTargetsForBuild.nairaTarget * monthsSpan,
      meterTarget: managerTargetsForBuild.meterTarget * monthsSpan,
    };
    if (!ws?.hasWorkspaceData || !ws.snapshot) {
      return {
        paidOnQuotesNgn: 0,
        producedSalesNgn: 0,
        quoteCount: 0,
        lowStockCount: liveLowStockCount,
        metersCuttingLists: 0,
        completedProductionMetres: 0,
        topByRevenue: [],
        periodKey: metricPeriod,
        periodLabel: periodMeta?.label ?? 'This month',
        targets: scaledTargets,
      };
    }
    return buildManagerSnapshotsFromWorkspace(
      workspaceQuotations,
      workspaceCuttingLists,
      workspaceProductionJobs,
      liveLowStockCount,
      managerTargetsForBuild,
      metricPeriod
    );
  }, [
    ws?.hasWorkspaceData,
    ws.snapshot,
    workspaceQuotations,
    workspaceCuttingLists,
    workspaceProductionJobs,
    liveLowStockCount,
    managerTargetsForBuild,
    metricPeriod,
  ]);

  const fetchData = async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    setLoadError(null);
    try {
      const [itemsRes, attentionRes] = await Promise.all([
        apiFetch('/api/management/items'),
        apiFetch('/api/management/attention'),
      ]);

      if (attentionRes.ok && attentionRes.data?.ok !== false) {
        setAttentionItems(Array.isArray(attentionRes.data.items) ? attentionRes.data.items : []);
        setAttentionSummary(attentionRes.data.summary || null);
      } else {
        setAttentionItems([]);
        setAttentionSummary(null);
      }

      const itemsOk =
        itemsRes.ok &&
        itemsRes.data &&
        Array.isArray(itemsRes.data.pendingClearance) &&
        itemsRes.data.ok !== false;
      if (itemsOk) {
        const d = itemsRes.data;
        setItems({
          pendingClearance: d.pendingClearance ?? [],
          flagged: d.flagged ?? [],
          productionOverrides: d.productionOverrides ?? [],
          pendingRefunds: d.pendingRefunds ?? [],
          pendingExpenses: d.pendingExpenses ?? [],
          pendingConversionReviews: d.pendingConversionReviews ?? [],
          pendingMaterialIncidents: d.pendingMaterialIncidents ?? [],
        });
      } else {
        const msg =
          itemsRes.data?.error ||
          (itemsRes.status === 403
            ? 'You need audit access, refund approval, or sales / quotation management rights to load this dashboard.'
            : itemsRes.status === 401
              ? 'Sign in again to load management data.'
              : `Management lists could not be loaded (${itemsRes.status}).`);
        setLoadError(msg);
      }

      let editAppr = [];
      if (userCanApproveEditMutationsClient(ws?.session?.user?.roleKey, ws?.permissions)) {
        const ea = await apiFetch('/api/edit-approvals/pending');
        if (ea.ok && ea.data?.ok && Array.isArray(ea.data.items)) editAppr = ea.data.items;
      }
      setEditApprovalPending(editAppr);
    } finally {
      setLoading(false);
      managerQueuesHydratedRef.current = true;
    }
  };

  useEffect(() => {
    void fetchData({ background: managerQueuesHydratedRef.current });
  }, [ws?.refreshEpoch]);

  const mgrBranchId = ws.viewAllBranches ? '' : ws.branchScope || ws.session?.currentBranchId || '';
  const mgrBranchLabel = useMemo(() => {
    if (!mgrBranchId) return '';
    return (
      (ws.snapshot?.branches || []).find((b) => String(b.id || b.branchId) === String(mgrBranchId))?.name ||
      mgrBranchId
    );
  }, [mgrBranchId, ws.snapshot?.branches]);

  useEffect(() => {
    if (!mgrBranchId) {
      setStockRegisterInbox([]);
      return;
    }
    void (async () => {
      const { ok, data } = await apiFetch('/api/stock-register/inbox?queue=manager');
      if (ok && data?.ok) setStockRegisterInbox(data.items || []);
    })();
  }, [mgrBranchId, ws?.refreshEpoch]);

  const fetchAudit = useCallback(async (quoteId) => {
    if (!quoteId) return;
    setLoadingAudit(true);
    const { ok, data } = await apiFetch(
      `/api/management/quotation-audit?quotationRef=${encodeURIComponent(quoteId)}`
    );
    if (ok && data) setAuditData(data);
    else setAuditData({ ok: false, error: data?.error || 'Could not load quotation audit.' });
    setLoadingAudit(false);
  }, []);

  const fetchPoAudit = useCallback(async (poId) => {
    if (!poId) return;
    setLoadingPoAudit(true);
    const { ok, data } = await apiFetch(`/api/management/po-audit?poId=${encodeURIComponent(poId)}`);
    if (ok && data) setPoAuditData(data);
    else setPoAuditData({ ok: false, error: data?.error || 'Could not load PO audit.' });
    setLoadingPoAudit(false);
  }, []);

  /** Deep link: ?quoteRef= from Sales (cutting list, etc.) */
  useEffect(() => {
    const ref = (searchParams.get('quoteRef') || '').trim();
    if (!ref || loading) return;
    if (quoteDeepLinked.current === ref) return;
    quoteDeepLinked.current = ref;

    const fromClearance = displayItems.pendingClearance.find((q) => q.id === ref);
    const fromFlagged = displayItems.flagged.find((q) => q.id === ref);
    const fromProd = displayItems.productionOverrides.find((o) => o.quotation_ref === ref);
    setRefundIntelExtras(null);
    const row = fromClearance || fromFlagged;
    if (row) {
      setSelectedIntel({
        kind: 'quotation',
        quoteId: ref,
        row: { ...row },
        reviewContext: fromFlagged ? 'flagged' : fromProd ? 'production' : 'clearance',
      });
    } else if (fromProd) {
      setSelectedIntel({
        kind: 'quotation',
        quoteId: ref,
        row: { id: ref, customer_name: fromProd.customer_name },
        cuttingListId: fromProd.id,
        fromProductionGate: true,
      });
    } else {
      setSelectedIntel({ kind: 'quotation', quoteId: ref, row: { id: ref, customer_name: '' } });
    }
    fetchAudit(ref);
    setActiveTab(fromProd || fromClearance || fromFlagged ? 'orders' : 'orders');
    if (fromFlagged) setAttentionFilter('flagged');
  }, [
    loading,
    searchParams,
    displayItems.pendingClearance,
    displayItems.flagged,
    displayItems.productionOverrides,
    fetchAudit,
  ]);

  /** Deep link: ?inbox=attention | orders | cash_out | qc | legacy tab keys */
  useEffect(() => {
    const inbox = (searchParams.get('inbox') || '').trim();
    if (!inbox) return;
    const { tab, attentionFilter: af } = normalizeManagerInboxRoute(inbox);
    if (tab === 'attendance' && !showAttendanceTab) {
      setActiveTab('attention');
      setAttentionFilter('all');
      return;
    }
    setActiveTab(tab);
    setAttentionFilter(af);
  }, [searchParams, showAttendanceTab]);

  useEffect(() => {
    const po = (searchParams.get('poId') || searchParams.get('poID') || '').trim();
    if (!po || loading) return;
    if (poDeepLinked.current === po) return;
    poDeepLinked.current = po;
    setActiveTab('attention');
    setSelectedIntel({ kind: 'purchase_order', poId: po, row: { poID: po } });
    void fetchPoAudit(po);
  }, [searchParams, loading, fetchPoAudit]);

  /** Deep link: ?refundId= from governance pack / attention inbox */
  useEffect(() => {
    const rid = (searchParams.get('refundId') || searchParams.get('refundID') || '').trim();
    if (!rid || loading) return;
    if (refundDeepLinked.current === rid) return;
    refundDeepLinked.current = rid;
    const row =
      displayItems.pendingRefunds.find((r) => String(r.refund_id) === rid) || { refund_id: rid };
    setRefundIntelExtras(null);
    setSelectedIntel({ kind: 'refund', refundId: rid, row: { ...row } });
    setActiveTab('cash_out');
  }, [loading, searchParams, displayItems.pendingRefunds]);

  /** Deep link: ?jobId= from notification bell / attention inbox */
  useEffect(() => {
    const jid = (searchParams.get('jobId') || searchParams.get('jobID') || '').trim();
    if (!jid || loading) return;
    if (jobDeepLinked.current === jid) return;
    jobDeepLinked.current = jid;
    const row =
      displayItems.pendingConversionReviews.find((j) => String(j.job_id) === jid) || { job_id: jid };
    setSelectedIntel({ kind: 'conversion', jobId: jid, row: { ...row } });
    setActiveTab('qc');
  }, [loading, searchParams, displayItems.pendingConversionReviews]);

  /** Deep link: ?requestId= from notification bell / attention inbox */
  useEffect(() => {
    const reqId = (searchParams.get('requestId') || searchParams.get('requestID') || '').trim();
    if (!reqId || loading) return;
    if (requestDeepLinked.current === reqId) return;
    requestDeepLinked.current = reqId;
    const row =
      displayItems.pendingExpenses.find((r) => String(r.request_id) === reqId) || { request_id: reqId };
    setSelectedIntel({ kind: 'payment', requestId: reqId, row: { ...row } });
    setActiveTab('cash_out');
  }, [loading, searchParams, displayItems.pendingExpenses]);

  useEffect(() => {
    setConversionSignoffRemark('');
    setConversionSignoffEditApprovalId('');
  }, [selectedIntel?.kind, selectedIntel?.jobId]);

  /** If URL opened before queues loaded, merge customer row when data arrives. */
  useEffect(() => {
    if (selectedIntel?.kind !== 'quotation') return;
    const ref = selectedIntel.quoteId;
    if (!ref || String(selectedIntel.row?.customer_name || '').trim()) return;
    const row =
      displayItems.pendingClearance.find((q) => q.id === ref) || displayItems.flagged.find((q) => q.id === ref);
    const po = displayItems.productionOverrides.find((o) => o.quotation_ref === ref);
    if (row)
      setSelectedIntel((prev) =>
        prev?.kind === 'quotation' && prev.quoteId === ref ? { ...prev, row: { ...prev.row, ...row } } : prev
      );
    else if (po)
      setSelectedIntel((prev) =>
        prev?.kind === 'quotation' && prev.quoteId === ref
          ? {
              ...prev,
              row: { ...prev.row, customer_name: po.customer_name },
              cuttingListId: po.id,
              fromProductionGate: true,
            }
          : prev
      );
  }, [
    displayItems.pendingClearance,
    displayItems.flagged,
    displayItems.productionOverrides,
    selectedIntel?.kind,
    selectedIntel?.quoteId,
    selectedIntel?.row?.customer_name,
  ]);

  const selectedIntelKind = selectedIntel?.kind;
  const selectedIntelQuoteId = selectedIntel?.quoteId;
  const selectedIntelRefundQref = selectedIntel?.row?.quotation_ref;

  useEffect(() => {
    const kind = selectedIntelKind;
    if (kind !== 'refund' && kind !== 'quotation') {
      setRefundIntelExtras(null);
      setLoadingRefundIntel(false);
      lastRefundIntelQrefRef.current = '';
      return;
    }
    const qref =
      kind === 'refund'
        ? String(selectedIntelRefundQref || '').trim()
        : String(selectedIntelQuoteId || '').trim();
    if (!qref) {
      setRefundIntelExtras(null);
      setLoadingRefundIntel(false);
      lastRefundIntelQrefRef.current = '';
      if (kind === 'refund') setAuditData(null);
      return;
    }
    if (kind === 'refund') void fetchAudit(qref);
    const sameQref = lastRefundIntelQrefRef.current === qref;
    lastRefundIntelQrefRef.current = qref;
    if (!sameQref) setLoadingRefundIntel(true);
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`);
      if (cancelled) return;
      setLoadingRefundIntel(false);
      if (ok && data && data.ok !== false) setRefundIntelExtras(data);
      else setRefundIntelExtras(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIntelKind, selectedIntelQuoteId, selectedIntelRefundQref, fetchAudit]);

  useEffect(() => {
    if (selectedIntel?.kind !== 'conversion') return;
    const qref = String(selectedIntel.row?.quotation_ref || '').trim();
    if (!qref) {
      setAuditData(null);
      return;
    }
    void fetchAudit(qref);
  }, [selectedIntel?.kind, selectedIntel?.row?.quotation_ref, selectedIntel?.jobId, fetchAudit]);

  useEffect(() => {
    const rk = String(ws?.session?.user?.roleKey || '').toLowerCase();
    if (!['md', 'admin', 'sales_manager'].includes(rk)) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/health');
      if (cancelled || !ok) return;
      syncAccountingPolicyFlagsFromHealth(data?.capabilities || {});
      setDeliveryGateMode(deliveryPaymentGateMode());
    })();
    return () => {
      cancelled = true;
    };
  }, [ws?.session?.user?.roleKey]);

  const tabCounts = useMemo(
    () => ({
      attention: attentionItems.length,
      orders: ordersInboxRows.length,
      cash_out: cashOutInboxRows.length,
      qc: (displayItems.pendingConversionReviews ?? []).length,
      material: materialIncidentQueue.length,
      attendance: 0,
      credit: pendingCreditCount,
    }),
    [
      attentionItems.length,
      ordersInboxRows.length,
      cashOutInboxRows.length,
      displayItems.pendingConversionReviews,
      materialIncidentQueue.length,
      pendingCreditCount,
    ]
  );

  const totalOpenActions = useMemo(
    () => tabCounts.orders + tabCounts.cash_out + tabCounts.qc + tabCounts.material + editApprovalPending.length,
    [tabCounts, editApprovalPending.length]
  );

  const filteredInboxRows = useMemo(() => {
    let list = [];
    if (activeTab === 'attention') {
      list = filterAttentionItems(attentionItems, attentionFilter);
    } else if (activeTab === 'orders') list = ordersInboxRows;
    else if (activeTab === 'cash_out') list = cashOutInboxRows;
    else if (activeTab === 'qc') list = displayItems.pendingConversionReviews ?? [];
    else if (activeTab === 'material') list = materialIncidentQueue;
    return list.filter((row) => matchesInboxSearch(inboxSearch, row, activeTab));
  }, [
    activeTab,
    attentionFilter,
    attentionItems,
    ordersInboxRows,
    cashOutInboxRows,
    displayItems.pendingConversionReviews,
    materialIncidentQueue,
    inboxSearch,
  ]);

  const producedSalesProgress =
    displaySnapshots.targets?.nairaTarget > 0
      ? Math.min(
          100,
          Math.round((displaySnapshots.producedSalesNgn / displaySnapshots.targets.nairaTarget) * 100)
        )
      : 0;
  const productionMetresProgress =
    displaySnapshots.targets?.meterTarget > 0
      ? Math.min(
          100,
          Math.round((displaySnapshots.completedProductionMetres / displaySnapshots.targets.meterTarget) * 100)
        )
      : 0;

  const openQuotationIntel = useCallback(
    (quotationId, row, extra = {}) => {
      if (!quotationId) return;
      const baseRow = row ? { ...row } : { id: quotationId, customer_name: '' };
      setRefundIntelExtras(null);
      const reviewContext =
        extra.reviewContext ||
        (extra.fromProductionGate
          ? 'production'
          : row?.manager_flag_reason || row?.manager_flagged_at_iso
            ? 'flagged'
            : 'clearance');
      setSelectedIntel({
        kind: 'quotation',
        quoteId: quotationId,
        row: baseRow,
        reviewContext,
        ...extra,
      });
      setAuditData(null);
      lastRefundIntelQrefRef.current = '';
      fetchAudit(quotationId);
    },
    [fetchAudit]
  );

  const openAttentionItem = useCallback(
    (item) => {
      if (!item) return;
      const row = item.row || {};
      const kind = item.kind;
      if (kind === 'clearance' || kind === 'flagged') {
        const qid = item.quotationRef || row.id;
        openQuotationIntel(qid, row, {
          reviewContext: kind === 'flagged' ? 'flagged' : 'clearance',
        });
        setActiveTab('orders');
        return;
      }
      if (kind === 'production') {
        const qref = item.quotationRef || row.quotation_ref;
        openQuotationIntel(
          qref,
          { id: qref, customer_name: row.customer_name },
          { cuttingListId: item.cuttingListId || row.id, fromProductionGate: true }
        );
        setActiveTab('orders');
        return;
      }
      if (kind === 'conversions') {
        setAuditData(null);
        setRefundIntelExtras(null);
        setSelectedIntel({ kind: 'conversion', jobId: item.jobId || row.job_id, row: { ...row } });
        setActiveTab('qc');
        return;
      }
      if (kind === 'refunds') {
        setSelectedIntel({ kind: 'refund', refundId: item.refundId || row.refund_id, row: { ...row } });
        setActiveTab('cash_out');
        return;
      }
      if (kind === 'payments') {
        setAuditData(null);
        setRefundIntelExtras(null);
        setSelectedIntel({ kind: 'payment', requestId: item.requestId || row.request_id, row: { ...row } });
        setActiveTab('cash_out');
        return;
      }
      if (kind === 'material') {
        setActiveTab('material');
        return;
      }
      if (kind === 'edit_approvals') {
        setActiveTab('attention');
        setAttentionFilter('edits');
        return;
      }
      if (kind === 'governance') {
        const refundId = item.refundId || row.refundId;
        if (refundId) {
          setAuditData(null);
          setRefundIntelExtras(null);
          setSelectedIntel({
            kind: 'refund',
            refundId,
            row: { refund_id: refundId, quotation_ref: item.quotationRef || row.quotationRef || '', ...row },
          });
          setActiveTab('cash_out');
          return;
        }
        const qref = String(item.quotationRef || row.quotationRef || '').trim();
        if (qref) {
          openQuotationIntel(
            qref,
            { id: qref, customer_name: row.customer_name || item.subtitle || '' },
            { fromProductionGate: true, cuttingListId: item.cuttingListId || row.cuttingListId || '' }
          );
          setActiveTab('orders');
          return;
        }
        return;
      }
      if (item.poId) {
        const po = item.poId;
        setAuditData(null);
        setRefundIntelExtras(null);
        setSelectedIntel({ kind: 'purchase_order', poId: po, row: { poID: po, ...row } });
        void fetchPoAudit(po);
      }
    },
    [fetchPoAudit, navigate, openQuotationIntel]
  );

  const handleReview = async (quotationId, decision, reason = '') => {
    if (!quotationId) return;
    if ((decision === 'clear' || decision === 'flag') && !canManagerClearance) {
      showToast('Quotation clearance requires Branch Manager, MD, or Administrator authority.', { variant: 'error' });
      return;
    }
    if (decision === 'release_payments' && !canReleasePaymentHolds) {
      showToast('Releasing payment holds requires Managing Director or Administrator authority.', { variant: 'error' });
      return;
    }
    if (decision === 'approve_production') {
      const paidNgn = Math.round(
        Number(
          selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === quotationId
            ? selectedIntel.row?.paid_ngn ?? selectedIntel.row?.paidNgn
            : items.pendingClearance.find((q) => q.id === quotationId)?.paid_ngn ??
                items.productionOverrides.find((o) => o.quotation_ref === quotationId)?.paid_ngn
        ) || 0
      );
      if (!canApproveProductionGate(ws?.session?.user?.roleKey, { paidNgn })) {
        showToast(productionGateOverrideDeniedMessage(paidNgn), { variant: 'error' });
        return;
      }
      let overrideReason = String(reason || '').trim();
      if (!productionGateOverrideNoteValid(overrideReason)) {
        const prompted =
          window.prompt(
            'Why may production proceed below the payment threshold? (required, at least 8 characters)'
          ) ?? '';
        overrideReason = prompted.trim();
      }
      if (!productionGateOverrideNoteValid(overrideReason)) {
        if (overrideReason !== '' || reason === '') {
          showToast('Override reason must be at least 8 characters.', { variant: 'error' });
        }
        return;
      }
      reason = overrideReason;
    }
    setDecisionBusy(true);
    const { ok, data } = await apiFetch('/api/management/review', {
      method: 'POST',
      body: JSON.stringify({ quotationId, decision, reason }),
    });
    setDecisionBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not apply manager decision.', { variant: 'error' });
      return;
    }
    const labels = {
      clear: 'Clearance approved.',
      approve_production: 'Production override saved. Cutting list can proceed in Sales.',
      flag: 'Moved to flagged queue for audit.',
      release_payments: 'Payment hold released — sales can post receipts on this quotation again.',
    };
    showToast(labels[decision] || 'Updated.', { variant: 'success' });
    await fetchData();
    await (ws.refresh?.() ?? Promise.resolve());
    if (selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === quotationId) {
      setSelectedIntel(null);
      setAuditData(null);
    }
  };

  const handleClearAllClearance = async () => {
    if (!canManagerClearance) {
      showToast('Quotation clearance requires Branch Manager authority.', { variant: 'error' });
      return;
    }
    const rows = filteredInboxRows.filter((row) => row._inboxKind === 'clearance');
    const eligible = rows.filter((row) => {
      const paid = Math.round(Number(row.paid_ngn) || 0);
      const total = Math.round(Number(row.total_ngn) || 0);
      return total <= 0 || isEffectivelyFullyPaid(paid, total);
    });
    const skippedBalance = rows.length - eligible.length;
    if (eligible.length === 0) {
      showToast(
        skippedBalance > 0
          ? 'None of the visible quotes meet the 99.5% paid rule — post remaining balances before sign-off.'
          : 'No quotations to clear.',
        { variant: 'error' }
      );
      return;
    }
    const skipNote =
      skippedBalance > 0
        ? `\n\n${skippedBalance} quote(s) with balance due will be skipped.`
        : '';
    const ok = window.confirm(
      `Approve order sign-off for ${eligible.length} quotation(s)? Each quote is reviewed individually; bulk clear applies only to quotes at 99.5% paid or above.${skipNote}`
    );
    if (!ok) return;

    setDecisionBusy(true);
    let cleared = 0;
    let failed = 0;
    for (const row of eligible) {
      const { ok: reqOk, data } = await apiFetch('/api/management/review', {
        method: 'POST',
        body: JSON.stringify({ quotationId: row.id, decision: 'clear', reason: '' }),
      });
      if (reqOk && data?.ok !== false) cleared += 1;
      else failed += 1;
    }
    setDecisionBusy(false);
    await fetchData();
    await (ws.refresh?.() ?? Promise.resolve());
    setSelectedIntel(null);
    setAuditData(null);

    if (failed === 0) {
      const suffix = skippedBalance > 0 ? ` (${skippedBalance} skipped — balance due.)` : '';
      showToast(`Clearance approved for ${cleared} quotation(s).${suffix}`, { variant: 'success' });
    } else if (cleared > 0) {
      showToast(
        `Cleared ${cleared}; ${failed} could not be cleared.${skippedBalance > 0 ? ` ${skippedBalance} skipped (balance due).` : ''}`,
        { variant: 'success' }
      );
    } else {
      showToast('Could not clear any quotations.', { variant: 'error' });
    }
  };

  const handleRefundDecision = async (status, alignmentExtras = {}) => {
    if (selectedIntel?.kind !== 'refund') return;
    const note =
      window.prompt(status === 'Approved' ? 'Optional note for approval' : 'Reason for rejection (optional)') ?? '';
    const amount = Number(selectedIntel.row?.amount_ngn) || 0;
    setDecisionBusy(true);
    const { ok, data } = await apiFetch(
      `/api/refunds/${encodeURIComponent(selectedIntel.refundId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({
          status,
          managerComments: note.trim(),
          ...(status === 'Approved' && amount > 0 ? { approvedAmountNgn: amount } : {}),
          ...(status === 'Approved' && alignmentExtras?.productionAlignmentAcknowledgedCodes
            ? {
                productionAlignmentAcknowledgedCodes: alignmentExtras.productionAlignmentAcknowledgedCodes,
                productionAlignmentOverrideNote: alignmentExtras.productionAlignmentOverrideNote || '',
              }
            : {}),
        }),
      }
    );
    setDecisionBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not update refund.', { variant: 'error' });
      return;
    }
    showToast(status === 'Approved' ? 'Refund approved.' : 'Refund rejected.', { variant: 'success' });
    await fetchData();
    await (ws.refresh?.() ?? Promise.resolve());
    setSelectedIntel(null);
    setRefundIntelExtras(null);
  };

  const handlePaymentDecision = async (status) => {
    if (selectedIntel?.kind !== 'payment') return;
    const note =
      window.prompt(status === 'Approved' ? 'Optional note' : 'Reason for rejection (optional)') ?? '';
    setDecisionBusy(true);
    const { ok, data } = await apiFetch(
      `/api/payment-requests/${encodeURIComponent(selectedIntel.requestId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ status, note: note.trim() }),
      }
    );
    setDecisionBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not update payment request.', { variant: 'error' });
      return;
    }
    showToast(status === 'Approved' ? 'Payment request approved.' : 'Payment request rejected.', {
      variant: 'success',
    });
    await fetchData();
    await (ws.refresh?.() ?? Promise.resolve());
    setSelectedIntel(null);
  };

  const handleConversionSignoff = async () => {
    if (selectedIntel?.kind !== 'conversion') return;
    const remark = conversionSignoffRemark.trim();
    if (remark.length < 3) {
      showToast('Enter a sign-off remark (at least 3 characters).', { variant: 'error' });
      return;
    }
    setDecisionBusy(true);
    const { ok, data } = await apiFetch(
      `/api/production-jobs/${encodeURIComponent(selectedIntel.jobId)}/manager-review-signoff`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          remark,
          ...(conversionSignoffEditApprovalId.trim()
            ? { editApprovalId: conversionSignoffEditApprovalId.trim() }
            : {}),
        }),
      }
    );
    setDecisionBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not sign off this job.', { variant: 'error' });
      return;
    }
    showToast('Conversion review signed off.', { variant: 'success' });
    setConversionSignoffRemark('');
    setConversionSignoffEditApprovalId('');
    await fetchData();
    await (ws.refresh?.() ?? Promise.resolve());
    setSelectedIntel(null);
  };

  const inboxRowBase =
    'group w-full text-left flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset';

  const renderAttentionInboxRow = (it) => {
    const reasons = Array.isArray(it.reasons) ? it.reasons : [];
    if (it.kind === 'edit_approvals') {
      const e = it.row || {};
      return (
        <div key={it.id} className={`${inboxRowBase} hover:bg-slate-50/80`}>
          <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-900">
            edit
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
            {e.entityKind} · <span className="font-mono">{e.entityId}</span>
            {' · '}
            {formatPersonName(e.requestedByDisplay || e.requestedByUserId || '—')}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-black uppercase text-white hover:brightness-105"
            onClick={async () => {
              const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(e.id)}/approve`, {
                method: 'POST',
                body: JSON.stringify({}),
              });
              if (!ok || !data?.ok) {
                showToast(data?.error || 'Could not approve.', { variant: 'error' });
                return;
              }
              showToast('Edit approval granted — token is valid for one save.');
              await fetchData();
              await (ws.refreshEditApprovalsPending?.() ?? Promise.resolve());
            }}
          >
            Approve
          </button>
        </div>
      );
    }
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => openAttentionItem(it)}
        className={`${inboxRowBase} hover:bg-violet-50/50 focus-visible:ring-violet-300/40`}
      >
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
            it.kind === 'flagged' || it.kind === 'governance'
              ? 'bg-rose-100 text-rose-900'
              : 'bg-violet-100 text-violet-900'
          }`}
        >
          {it.kind}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
          <span className="font-mono font-bold text-[#134e4a]">{it.title}</span>
          {' · '}
          {it.subtitle}
        </span>
        {it.amountNgn != null ? (
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-700">{formatNgn(it.amountNgn)}</span>
        ) : null}
        <span className="hidden lg:inline shrink-0 max-w-[8rem] truncate text-[9px] text-slate-500">
          {reasons[0] || ''}
        </span>
        <ChevronRight size={14} className="shrink-0 text-slate-300" />
      </button>
    );
  };

  const renderInboxRow = (row) => {
    if (activeTab === 'attention') {
      return renderAttentionInboxRow(row);
    }
    if (activeTab === 'orders') {
      if (row._inboxKind === 'flagged') {
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() =>
              openQuotationIntel(row.id, row, { reviewContext: 'flagged' })
            }
            className={`${inboxRowBase} hover:bg-rose-50/50 focus-visible:ring-rose-300/40 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-rose-50/70' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-900">
              flagged
            </span>
            <span className="shrink-0 text-xs font-bold text-rose-900">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
              <span className="font-semibold">{formatPersonName(row.customer_name)}</span>
              {' · '}
              <span className="text-rose-800/90">{row.manager_flag_reason || 'Awaiting audit review.'}</span>
            </span>
            <AlertTriangle size={14} className="shrink-0 text-rose-500" />
          </button>
        );
      }
      if (row._inboxKind === 'production') {
        const qref = row.quotation_ref;
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() =>
              openQuotationIntel(
                qref,
                { id: qref, customer_name: row.customer_name },
                { cuttingListId: row.id, fromProductionGate: true }
              )
            }
            className={`${inboxRowBase} hover:bg-amber-50/60 focus-visible:ring-amber-400/30 ${
              selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === qref ? 'bg-amber-50/80' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900">
              gate
            </span>
            <span className="shrink-0 text-xs font-mono font-bold text-slate-600">{row.id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
              <span className="font-bold text-[#134e4a]">{qref}</span>
              {' · '}
              {formatPersonName(row.customer_name)}
            </span>
            <span className="shrink-0 text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
              {formatNgn(row.paid_ngn)} / {formatNgn(row.total_ngn)}
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-amber-700" />
          </button>
        );
      }
      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => openQuotationIntel(row.id, row)}
          className={`${inboxRowBase} hover:bg-teal-50/60 focus-visible:ring-[#134e4a]/25 ${
            selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === row.id ? 'bg-teal-50/80' : ''
          }`}
        >
          <span className="shrink-0 rounded-md bg-teal-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-teal-900">
            sign-off
          </span>
          <span className="shrink-0 text-xs font-bold text-[#134e4a] tabular-nums">{row.id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {formatPersonName(row.customer_name)}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {formatNgn(row.paid_ngn)} / {formatNgn(row.total_ngn)}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" />
        </button>
      );
    }
    if (activeTab === 'cash_out') {
      if (row._inboxKind === 'payment') {
        return (
          <button
            key={row._rowKey}
            type="button"
            onClick={() => {
              setAuditData(null);
              setRefundIntelExtras(null);
              setSelectedIntel({ kind: 'payment', requestId: row.request_id, row: { ...row } });
            }}
            className={`${inboxRowBase} hover:bg-slate-50/80 focus-visible:ring-slate-300/50 ${
              selectedIntel?.kind === 'payment' && selectedIntel.requestId === row.request_id ? 'bg-slate-100/90' : ''
            }`}
          >
            <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-800">
              expense
            </span>
            <span className="shrink-0 text-xs font-bold text-slate-800">{row.request_id}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-600">{row.description}</span>
            <span className="shrink-0 text-[10px] font-bold text-rose-700 tabular-nums whitespace-nowrap">
              {formatNgn(row.amount_requested_ngn)}
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
          </button>
        );
      }
      return (
        <button
          key={row._rowKey}
          type="button"
          onClick={() => setSelectedIntel({ kind: 'refund', refundId: row.refund_id, row: { ...row } })}
          className={`${inboxRowBase} hover:bg-amber-50/50 focus-visible:ring-amber-300/40 ${
            selectedIntel?.kind === 'refund' && selectedIntel.refundId === row.refund_id ? 'bg-amber-50/80' : ''
          }`}
        >
          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900">
            refund
          </span>
          <span className="shrink-0 text-xs font-mono font-bold text-slate-800">{row.refund_id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {formatPersonName(row.customer_name)}
            {' · '}
            <span className="font-normal text-slate-500">
              {row.quotation_ref} · {formatRefundReasonCategory(row.reason_category)}
            </span>
          </span>
          <span className="shrink-0 text-[10px] font-bold text-amber-700 tabular-nums whitespace-nowrap">
            {formatNgn(row.amount_ngn)}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-amber-700" />
        </button>
      );
    }
    if (activeTab === 'qc') {
      const alert = String(row.conversion_alert_state || '');
      return (
        <button
          key={row.job_id}
          type="button"
          onClick={() => {
            setAuditData(null);
            setRefundIntelExtras(null);
            setSelectedIntel({ kind: 'conversion', jobId: row.job_id, row: { ...row } });
          }}
          className={`${inboxRowBase} hover:bg-violet-50/60 focus-visible:ring-violet-300/40 ${
            selectedIntel?.kind === 'conversion' && selectedIntel.jobId === row.job_id ? 'bg-violet-50/80' : ''
          }`}
        >
          <span className="shrink-0 text-[10px] font-mono font-bold text-slate-700">{row.job_id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
            <span className="font-bold text-[#134e4a]">{row.quotation_ref || '—'}</span>
            {' · '}
            <span className="font-semibold">{formatPersonName(row.customer_name)}</span>
            {row.product_name ? (
              <>
                {' · '}
                <span className="text-slate-500">{row.product_name}</span>
              </>
            ) : null}
          </span>
          <span
            className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${
              alert === 'High'
                ? 'bg-rose-100 text-rose-800'
                : alert === 'Low'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {alert || 'Review'}
          </span>
          <span className="shrink-0 text-[10px] text-slate-500 tabular-nums whitespace-nowrap hidden sm:inline">
            {row.actual_meters != null ? `${Number(row.actual_meters).toLocaleString()} m` : '—'}
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-violet-700" />
        </button>
      );
    }
    if (activeTab === 'material') {
      return (
        <button
          key={row.id}
          type="button"
          onClick={() =>
            navigate('/operations', {
              state: { focusOpsTab: 'materialExceptions', materialIncidentId: row.id },
            })
          }
          className={`${inboxRowBase} hover:bg-teal-50/60 focus-visible:ring-[#134e4a]/25`}
        >
          <span className="shrink-0 rounded-md bg-teal-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-teal-900">
            material
          </span>
          <span className="shrink-0 text-xs font-mono font-bold text-[#134e4a]">{row.id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
            {String(row.incident_type || '').replace(/_/g, ' ')}
            {' · '}
            {row.gauge_label} {row.colour}
            {' · '}
            <span className="font-bold tabular-nums">{Number(row.total_meters || 0).toFixed(1)} m</span>
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-[#134e4a]" />
        </button>
      );
    }
    return null;
  };

  const tabMeta = managerInboxTabs.find((t) => t.key === activeTab);

  return (
    <PageShell className="pb-14">
      {loadError ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 mb-6"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}

      {['md', 'admin', 'sales_manager'].includes(String(ws?.session?.user?.roleKey || '').toLowerCase()) ? (
        <div className="mb-6">
          <DeliveryGateDiagnosticsBanner deliveryPaymentGate={deliveryGateMode} />
        </div>
      ) : null}

      {!loading && pendingOrderSignOffCount > 0 ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#134e4a]">Order sign-off required</p>
            <p className="text-xs text-slate-600 mt-1">
              {pendingOrderSignOffCount} paid quotation{pendingOrderSignOffCount === 1 ? '' : 's'} from the sales
              office need branch manager review — with or without a refund on the quote. Open each for personal
              sign-off (99.5% paid counts as fully paid).
            </p>
          </div>
          <button
            type="button"
            className="z-btn-primary shrink-0"
            onClick={() => {
              setActiveTab('orders');
              setAttentionFilter('all');
            }}
          >
            Review orders
          </button>
        </div>
      ) : null}

      {mgrBranchId ? (
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#134e4a]">Month-end stock register</p>
            <p className="text-xs text-slate-600 mt-1">
              {stockRegisterInbox.length
                ? `${stockRegisterInbox.length} period(s) awaiting manager count alignment.`
                : 'No registers waiting for manager review.'}
            </p>
          </div>
          <button type="button" className="z-btn-primary shrink-0" onClick={() => setStockRegisterMgrOpen(true)}>
            Review stock register
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#134e4a] via-[#0f3d39] to-[#0a2e2c] text-white p-6 sm:p-8 mb-6 shadow-lg shadow-teal-950/10">
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
                {ws?.hasWorkspaceData ? (
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
              <div
                className="flex flex-wrap gap-1 mt-3 mb-1"
                role="group"
                aria-label="Metrics time range"
              >
                {MANAGER_METRIC_PERIODS.map((p) => {
                  const on = metricPeriod === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setMetricPeriod(p.key)}
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
                <span>Sales produced (same basis as KPI strip)</span>
                <span
                  className="inline-flex rounded-full p-0.5 text-teal-200/80 hover:text-white hover:bg-white/10 cursor-help"
                  title="Quotation totals allocated to completed production jobs in this period, by job completion date — not cash date. Treasury and low-stock KPIs stay in the strip below."
                >
                  <HelpCircle size={14} aria-hidden />
                  <span className="sr-only">Explain sales produced</span>
                </span>
              </p>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                {formatNgn(displaySnapshots.producedSalesNgn)}
              </p>
              <p
                className="text-[11px] text-teal-100/80 mt-1.5 tabular-nums flex items-center gap-1.5 flex-wrap"
                title="Sum of paidNgn on quotations whose quote date falls in the selected period. This is cash recorded on quotes, not production-attributed revenue."
              >
                <span>Collected on quotations (quote date): {formatNgn(displaySnapshots.paidOnQuotesNgn)}</span>
                <HelpCircle size={13} className="shrink-0 text-teal-200/70" aria-hidden />
              </p>
              <p className="text-xs text-white/70 mt-2 max-w-md">
                {totalOpenActions} open management item{totalOpenActions === 1 ? '' : 's'} across queues
                {loading ? ' · refreshing…' : ''}.
                {ws?.hasWorkspaceData
                  ? ' Numbers and inbox follow your signed-in workspace snapshot.'
                  : ' Connect the workspace to sync inbox rows with Sales and Operations in real time.'}
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
        {showExecProdShortcut || showExecInvShortcut ? (
          <div
            className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4"
            role="group"
            aria-label="Executive store and production tools"
          >
            <span className="w-full text-[9px] font-bold uppercase tracking-wider text-teal-200/80">
              Store and production (executive)
            </span>
            {showExecProdShortcut ? (
              <button
                type="button"
                onClick={() => navigate('/operations', { state: { focusOpsTab: 'production' } })}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-white/15"
              >
                <PencilLine size={14} aria-hidden />
                Edit production
              </button>
            ) : null}
            {showExecInvShortcut ? (
              <button
                type="button"
                onClick={() =>
                  navigate('/operations', {
                    state: {
                      focusOpsTab: 'inventory',
                      ...(canExecInvOpenAdjust ? { openStockAdjust: true } : {}),
                    },
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-white/15"
              >
                <Package size={14} aria-hidden />
                Edit stock
              </button>
            ) : null}
          </div>
        ) : null}
        {showBiShortcut ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => navigate('/exec?tab=intelligence')}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-300/40 bg-teal-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-teal-100 hover:bg-teal-400/20"
            >
              <Sparkles size={14} aria-hidden />
              Intelligence
            </button>
          </div>
        ) : null}
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
        <p className="text-[9px] text-teal-200/55 mt-3 max-w-xl leading-relaxed">
          Progress bars use monthly targets × selected range. Company defaults (Settings → Preferences, admins) apply
          to everyone unless you enable a personal override there.
        </p>
      </div>

      <DashboardKpiStrip
        sectionClassName="mb-6"
        omitMetresAndSales
        metricsWindow={{
          startISO: managementPeriodStartISO(metricPeriod),
          label: displaySnapshots.periodLabel ?? 'This month',
        }}
      />

      {userMayViewManagementReportsClient(ws) ? (
        <OperationalSummaryWidget className="mb-6" linkTo="/reports" />
      ) : null}

      {!ws?.hasWorkspaceData ? (
        <p className="text-xs font-semibold text-slate-500 mb-6">
          KPI strip uses live workspace data — connect to the API if figures look empty.
        </p>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start min-w-0">
        <div className="xl:col-span-12 space-y-6">
          <Card className="overflow-hidden border-slate-200/90 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-[#134e4a] tracking-tight flex items-center gap-2">
                    <ShieldCheck size={18} className="text-teal-600 shrink-0" />
                    Action inbox
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">{tabMeta?.description}</p>
                </div>
                <motion.div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
                  {activeTab !== 'attendance' && activeTab === 'orders' && canManagerClearance && filteredInboxRows.some((r) => r._inboxKind === 'clearance') ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={decisionBusy || loading}
                      onClick={handleClearAllClearance}
                      className="shrink-0 w-full sm:w-auto"
                    >
                      <CheckCircle2 size={14} />
                      Clear all paid
                    </Button>
                  ) : null}
                  {activeTab !== 'attendance' ? (
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                        placeholder="Filter this queue…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#134e4a]/15"
                      />
                    </div>
                  ) : null}
                </motion.div>
              </div>
              <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
                {managerInboxTabs.map((t) => {
                  const active = activeTab === t.key;
                  const count = tabCounts[t.key] ?? 0;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(t.key);
                        if (t.key !== 'attention') setAttentionFilter('all');
                      }}
                      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors border ${
                        active
                          ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                      <span
                        className={`tabular-nums px-1.5 py-0.5 rounded-md text-[9px] ${
                          active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {activeTab === 'attention' ? (
                <div
                  className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar"
                  role="group"
                  aria-label="Everything filters"
                >
                  {MANAGER_ATTENTION_FILTERS.map((f) => {
                    const active = attentionFilter === f.key;
                    const count =
                      f.key === 'all'
                        ? attentionItems.length
                        : filterAttentionItems(attentionItems, f.key).length;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setAttentionFilter(f.key)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-colors ${
                          active
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-800'
                        }`}
                      >
                        {f.label}
                        <span className={`ml-1 tabular-nums ${active ? 'text-violet-100' : 'text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div
              className={
                activeTab === 'attendance' || activeTab === 'credit'
                  ? 'p-4 sm:p-5'
                  : 'min-h-[420px] max-h-[min(56vh,560px)] overflow-y-auto custom-scrollbar'
              }
            >
              {activeTab === 'attendance' ? (
                <HrDailyRollPanel branchManagerMode />
              ) : activeTab === 'credit' ? (
                <CreditExceptionPanel
                  branchId={ws?.workspaceBranchId || ws?.session?.branchId || null}
                  roleKey={ws?.session?.user?.roleKey}
                />
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                  <RefreshCw size={28} className="animate-spin text-[#134e4a]" />
                  <p className="text-xs font-bold uppercase tracking-widest">Loading queues</p>
                </div>
              ) : filteredInboxRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                  {activeTab === 'orders' ? (
                    <CheckCircle2 size={36} className="opacity-25 mb-3 text-teal-600" />
                  ) : activeTab === 'cash_out' ? (
                    <DollarSign size={36} className="opacity-25 mb-3 text-amber-600" />
                  ) : activeTab === 'qc' ? (
                    <BarChart3 size={36} className="opacity-25 mb-3 text-violet-600" />
                  ) : activeTab === 'material' ? (
                    <ClipboardList size={36} className="opacity-25 mb-3 text-teal-600" />
                  ) : activeTab === 'attendance' ? (
                    <Users size={36} className="opacity-25 mb-3 text-teal-600" />
                  ) : (
                    <Sparkles size={36} className="opacity-25 mb-3 text-violet-500" />
                  )}
                  <p className="text-sm font-bold text-slate-600">Nothing in this queue</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    {inboxSearch.trim()
                      ? 'Try clearing the search filter.'
                      : 'When new items arrive, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div>{filteredInboxRows.map((row) => renderInboxRow(row))}</div>
              )}
            </div>
          </Card>

          <Card className="p-5 border-slate-200/90 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-[#134e4a]" />
              Top customers ({(displaySnapshots.periodLabel ?? 'this month').toLowerCase()})
            </h3>
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
        </div>

        <ModalFrame
          isOpen={Boolean(selectedIntel)}
          onClose={() => {
            setSelectedIntel(null);
            setAuditData(null);
            setRefundIntelExtras(null);
          }}
        >
          <div
            className={`z-modal-panel w-full p-0 overflow-hidden ${intelModalLight ? 'max-w-6xl' : 'max-w-5xl'}`}
          >
            <Card
              className={`flex flex-col shadow-xl overflow-hidden max-h-[min(92vh,960px)] ${
                intelModalLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div
                className={`p-4 border-b flex items-center justify-between gap-2 ${
                  intelModalLight ? 'border-slate-200 bg-white' : 'border-white/10'
                }`}
              >
                <h3
                  className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                    intelModalLight ? 'text-slate-500' : 'text-white/50'
                  }`}
                >
                  <History size={14} className={intelModalLight ? 'text-[#134e4a]' : 'text-teal-400'} />
                  {intelModalTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntel(null);
                    setAuditData(null);
                    setRefundIntelExtras(null);
                  }}
                  className={`text-[10px] font-bold uppercase transition-colors ${
                    intelModalLight ? 'text-slate-400 hover:text-slate-800' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Close
                </button>
              </div>

              <div
                className={`flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 ${
                  intelModalLight ? 'bg-slate-100 space-y-3' : 'space-y-5 text-white'
                }`}
              >
                {selectedIntel?.kind === 'quotation' ? (
                <>
                  <OfficialRecordBanner
                    item={selectedUnifiedWorkItem}
                    light={intelModalLight}
                    quoteFallbackId={officialRecordFallbackId}
                    showOpenRecord={selectedIntel?.kind === 'payment'}
                    onOpenRecord={openUnifiedWorkItem}
                  />
                  <ClearanceManagerApprovalPreview
                    quoteId={selectedIntel.quoteId}
                    inboxRow={selectedIntel.row}
                    auditData={auditData}
                    paymentIntel={refundIntelExtras}
                    loadingAudit={loadingAudit}
                    loadingIntel={loadingRefundIntel}
                    formatNgn={formatNgn}
                    decisionBusy={decisionBusy}
                    reviewContext={selectedIntel.reviewContext || 'clearance'}
                    fromProductionGate={Boolean(selectedIntel.fromProductionGate)}
                    cuttingListId={selectedIntel.cuttingListId || ''}
                    canProductionOverride={canApproveProductionGate(ws?.session?.user?.roleKey, {
                      paidNgn: Math.round(
                        Number(
                          selectedIntel.row?.paid_ngn ??
                            auditData?.summary?.paidNgn ??
                            auditData?.quotation?.paidNgn
                        ) || 0
                      ),
                    })}
                    canManagerClearance={canManagerClearance}
                    canReleasePaymentHolds={canReleasePaymentHolds}
                    showReleasePayments={Boolean(
                      selectedUnifiedWorkItem?.managerClearedAtIso ||
                        selectedUnifiedWorkItem?.managerFlaggedAtIso ||
                        auditData?.summary?.managerClearedAtIso ||
                        auditData?.summary?.managerFlaggedAtIso
                    )}
                    onApprove={() => handleReview(selectedIntel.quoteId, 'clear')}
                    onDisapprove={() => {
                      const reason = window.prompt('Why are you disapproving this clearance? (required)');
                      if (reason && reason.trim()) handleReview(selectedIntel.quoteId, 'flag', reason.trim());
                    }}
                    onFlag={() => {
                      const reason = window.prompt('Reason for audit flag? (required)');
                      if (reason && reason.trim()) handleReview(selectedIntel.quoteId, 'flag', reason.trim());
                    }}
                    onReleasePayments={() => {
                      const ok = window.confirm(
                        'Release payment hold on this quotation? Sales will be able to post receipts again until you clear or flag it.'
                      );
                      if (ok) handleReview(selectedIntel.quoteId, 'release_payments');
                    }}
                    onProductionOverride={() => handleReview(selectedIntel.quoteId, 'approve_production')}
                  />
                  <ManagementAuditSections
                    auditData={auditData}
                    loadingAudit={loadingAudit}
                    formatNgn={formatNgn}
                    appearance="light"
                  />
                </>
              ) : selectedIntel?.kind === 'purchase_order' ? (
                <ManagerPoAuditSections
                  auditData={poAuditData}
                  loadingAudit={loadingPoAudit}
                  formatNgn={formatNgn}
                  appearance="light"
                />
              ) : selectedIntel?.kind === 'refund' ? (
                <>
                  <OfficialRecordBanner
                    item={selectedUnifiedWorkItem}
                    light={intelModalLight}
                    quoteFallbackId={officialRecordFallbackId}
                    showOpenRecord={selectedIntel?.kind === 'payment'}
                    onOpenRecord={openUnifiedWorkItem}
                  />
                  {!canApproveRefunds ? (
                    <ZareApprovalHint
                      context={{
                        referenceNo: selectedIntel.refundId,
                        documentType: 'refund_request',
                        status: selectedIntel.row?.status || 'Pending',
                        canApprove: false,
                        canMutate: ws?.canMutate !== false,
                        missingPermission:
                          'Refund approval requires refunds.approve or finance.approve permission.',
                        zareQuery: `Why can't I approve refund ${selectedIntel.refundId}?`,
                      }}
                    />
                  ) : null}
                  <RefundManagerApprovalPreview
                    refundId={selectedIntel.refundId}
                    inboxRow={selectedIntel.row}
                    refundRecord={selectedRefundRecord}
                    auditData={auditData}
                    loadingAudit={loadingAudit}
                    refundIntel={refundIntelExtras}
                    loadingIntel={loadingRefundIntel}
                    formatNgn={formatNgn}
                    decisionBusy={decisionBusy}
                    deliveryPaymentGate={deliveryGateMode}
                    refundExecutiveThresholdNgn={
                      Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000
                    }
                    onApprove={(alignmentExtras) => handleRefundDecision('Approved', alignmentExtras)}
                    onReject={() => handleRefundDecision('Rejected')}
                    onOpenSales={() =>
                      navigate('/sales', {
                        state: {
                          focusSalesTab: 'refund',
                          openSalesRecord: { type: 'refund', id: selectedIntel.refundId },
                        },
                      })
                    }
                  />
                  <ManagementAuditSections
                    auditData={auditData}
                    loadingAudit={loadingAudit}
                    formatNgn={formatNgn}
                    appearance="light"
                  />
                </>
              ) : selectedIntel?.kind === 'payment' ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300/90 mb-1">Payment request</p>
                    <h2 className="text-lg font-black text-white leading-tight">{selectedIntel.requestId}</h2>
                    <p className="text-xs text-white/45 mt-2 font-mono">{selectedIntel.row?.expense_id}</p>
                    {selectedIntel.row?.expense_category ? (
                      <p className="text-[11px] text-teal-200/90 mt-2">
                        Category:{' '}
                        <span className="font-semibold text-white/90">{selectedIntel.row.expense_category}</span>
                      </p>
                    ) : null}
                    {selectedIntel.row?.request_reference ? (
                      <p className="text-[11px] text-white/55 mt-2">
                        Reference: <span className="font-semibold text-white/80">{selectedIntel.row.request_reference}</span>
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-white/80 mt-3 tabular-nums">
                      {formatNgn(selectedIntel.row?.amount_requested_ngn)}
                    </p>
                    <p className="text-sm text-white/60 mt-3 leading-snug whitespace-pre-wrap">
                      {selectedIntel.row?.description}
                    </p>
                    <p className="text-[10px] text-white/35 mt-3 uppercase tracking-wide">{selectedIntel.row?.request_date}</p>
                    {paymentIntelLineItems.total > 0 ? (
                      <div className="z-scroll-x mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                        <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="text-white/50 uppercase tracking-wide border-b border-white/10 text-[11px] font-bold">
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5 text-right">Unit</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentIntelLineItems.lines.map((ln, i) => (
                              <tr key={i} className="border-b border-white/5 text-white/80">
                                <td className="p-2.5 max-w-0 whitespace-nowrap truncate" title={ln.item || '—'}>
                                  {ln.item || '—'}
                                </td>
                                <td className="p-2.5 text-right tabular-nums whitespace-nowrap">
                                  {Number(ln.unit) || 0}
                                </td>
                                <td className="p-2.5 text-right tabular-nums whitespace-nowrap">
                                  {formatNgn(Number(ln.unitPriceNgn ?? ln.unit_price_ngn) || 0)}
                                </td>
                                <td className="p-2.5 text-right tabular-nums font-semibold text-white/90 whitespace-nowrap">
                                  {formatNgn(Number(ln.lineTotalNgn ?? ln.line_total_ngn) || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {paymentIntelLineItems.total > 20 ? (
                          <p className="px-2.5 py-2 text-[11px] font-semibold text-white/45">
                            Showing 20 of {paymentIntelLineItems.total} lines.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedIntel.row?.attachment_present ? (
                        <a
                          href={apiUrl(
                            `/api/payment-requests/${encodeURIComponent(selectedIntel.requestId)}/attachment`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white"
                        >
                          <Paperclip size={14} />
                          {selectedIntel.row?.attachment_name || 'View attachment'}
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/35">No attachment</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          printExpenseRequestRecord(
                            {
                              requestID: selectedIntel.requestId,
                              requestDate: selectedIntel.row?.request_date,
                              requestReference: selectedIntel.row?.request_reference,
                              description: selectedIntel.row?.description,
                              expenseID: selectedIntel.row?.expense_id,
                              amountRequestedNgn: selectedIntel.row?.amount_requested_ngn,
                              approvalStatus: selectedIntel.row?.approval_status,
                              expenseCategory: selectedIntel.row?.expense_category,
                              lineItems: selectedIntel.row?.line_items,
                              attachmentName: selectedIntel.row?.attachment_name,
                              attachmentPresent: selectedIntel.row?.attachment_present,
                            },
                            formatNgn
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Printer size={14} />
                        Print record
                      </button>
                    </div>
                  </div>
                  <OfficialRecordBanner
                    item={selectedUnifiedWorkItem}
                    light={intelModalLight}
                    quoteFallbackId={officialRecordFallbackId}
                    showOpenRecord={selectedIntel?.kind === 'payment'}
                    onOpenRecord={openUnifiedWorkItem}
                  />
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Decision</p>
                    {!canApprovePaymentRequests ? (
                      <ZareApprovalHint
                        context={{
                          referenceNo: selectedIntel.requestId,
                          documentType: 'payment_request',
                          status: selectedIntel.row?.approval_status || 'Pending',
                          canApprove: false,
                          canMutate: ws?.canMutate !== false,
                          missingPermission:
                            'Payment request approval requires finance.approve permission.',
                          zareQuery: `Why can't I approve payment request ${selectedIntel.requestId}?`,
                        }}
                      />
                    ) : null}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={decisionBusy}
                        onClick={() => handlePaymentDecision('Approved')}
                        className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 size={18} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={decisionBusy}
                        onClick={() => handlePaymentDecision('Rejected')}
                        className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors"
                      >
                        <Flag size={18} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedIntel?.kind === 'conversion' ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/90 mb-1">Conversion review</p>
                    <h2 className="text-lg font-black text-white font-mono leading-tight">{selectedIntel.jobId}</h2>
                    <p className="text-xs font-bold text-teal-300/90 mt-2">{selectedIntel.row?.quotation_ref || '—'}</p>
                    <p className="text-sm font-semibold text-white/70 mt-1 truncate">
                      {formatPersonName(selectedIntel.row?.customer_name)}
                    </p>
                    <p className="text-[10px] text-white/45 mt-2">{selectedIntel.row?.product_name}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-white/10">
                        Alert: {selectedIntel.row?.conversion_alert_state || '—'}
                      </span>
                      {selectedIntel.row?.manager_review_required ? (
                        <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-amber-500/20 text-amber-200">
                          Manager review
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-white/50 mt-4 tabular-nums">
                      Actual: {Number(selectedIntel.row?.actual_meters || 0).toLocaleString()} m
                      {selectedIntel.row?.actual_weight_kg != null
                        ? ` · ${Number(selectedIntel.row.actual_weight_kg).toLocaleString()} kg`
                        : ''}
                    </p>
                    <p className="text-[9px] text-white/30 mt-2">
                      {selectedIntel.row?.completed_at_iso
                        ? new Date(selectedIntel.row.completed_at_iso).toLocaleString()
                        : ''}
                    </p>
                  </div>
                  <OfficialRecordBanner
                    item={selectedUnifiedWorkItem}
                    light={intelModalLight}
                    quoteFallbackId={officialRecordFallbackId}
                    showOpenRecord={selectedIntel?.kind === 'payment'}
                    onOpenRecord={openUnifiedWorkItem}
                  />

                  {selectedIntel.row?.quotation_ref ? (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-violet-300/90 uppercase tracking-widest">
                        Quotation context (payments, balance, meters, conversion trail)
                      </p>
                      <ManagementAuditSections auditData={auditData} loadingAudit={loadingAudit} formatNgn={formatNgn} />
                    </div>
                  ) : null}

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Sign off</p>
                    <p className="text-[10px] text-white/45 leading-relaxed">
                      Confirms you have reviewed High/Low conversion or the open manager review for this completed job.
                    </p>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/50">
                      Remark
                      <textarea
                        value={conversionSignoffRemark}
                        onChange={(e) => setConversionSignoffRemark(e.target.value)}
                        rows={2}
                        placeholder="e.g. Variance reviewed — approved to close."
                        className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-violet-400/40"
                      />
                    </label>
                    {selectedIntel.jobId ? (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-950/40 p-2">
                        <EditSecondApprovalInline
                          entityKind="production_job"
                          entityId={selectedIntel.jobId}
                          value={conversionSignoffEditApprovalId}
                          onChange={setConversionSignoffEditApprovalId}
                          className="!border-amber-300/50 !bg-amber-950/60 !text-amber-50"
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={decisionBusy}
                      onClick={() => void handleConversionSignoff()}
                      className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase text-[9px] tracking-widest disabled:opacity-50 transition-colors"
                    >
                      <Factory size={18} />
                      Sign off review
                    </button>
                  </div>
                </div>
              ) : null}
              </div>

              <div
                className={`p-3 border-t ${
                  intelModalLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/30'
                }`}
              >
                <p
                  className={`text-[9px] font-semibold text-center uppercase tracking-widest ${
                    intelModalLight ? 'text-slate-400' : 'text-white/25'
                  }`}
                >
                  Management · Zarewa
                </p>
              </div>
            </Card>
          </div>
        </ModalFrame>
      </div>

      <ModalFrame isOpen={showExpenseCorrectionModal} onClose={() => setShowExpenseCorrectionModal(false)}>
        <div className="z-modal-panel max-w-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-black text-[#134e4a]">Edit expense request</h3>
            <button
              type="button"
              onClick={() => setShowExpenseCorrectionModal(false)}
              className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          <ExpenseRequestFormFields
            form={expenseCorrectionForm}
            setForm={setExpenseCorrectionForm}
            onSubmit={saveExpenseCorrection}
            fileInputRef={payRequestFileRef}
            showToast={showToast}
            formatNgn={formatNgn}
            submitting={savingExpenseCorrection}
            submitLabel="Save request changes"
            hintBeforeSubmit={`Editing request ${editingPaymentRequestId || ''}. This updates request details only (no payout posting).`}
          />
        </div>
      </ModalFrame>

      <StockRegisterMonthEndModal
        isOpen={stockRegisterMgrOpen}
        onClose={() => setStockRegisterMgrOpen(false)}
        roleMode="manager"
        branchId={mgrBranchId}
        branchLabel={mgrBranchLabel}
        showToast={showToast}
        roleKey={ws.session?.user?.roleKey}
      />

    </PageShell>
  );
};

export default ManagerDashboard;
