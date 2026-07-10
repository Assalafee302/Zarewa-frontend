import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, apiUrl } from '../lib/apiBase';
import { printExpenseRequestRecord } from '../lib/expenseRequestPrint';
import { formatNgn } from '../lib/formatNgn';
import { useWorkspace } from '../context/WorkspaceContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { effectiveManagerTargetsPerMonth, mergeDashboardPrefs } from '../lib/dashboardPrefs';
import { userCanApproveEditMutationsClient } from '../lib/editApprovalUi';
import {
  canSeeExecutiveInventoryEditShortcut,
  canSeeExecutiveProductionEditShortcut,
} from '../lib/executiveStoreToolsAccess';
import { buildPaymentRequestBodyFromForm, initialExpenseRequestFormState } from '../lib/expenseRequestFormCore.js';
import {
  canApproveStaffPurchaseCredit,
  canRejectStaffPurchaseCredit,
} from '../lib/hrAccess';
import { decideStaffPurchaseCredit } from '../lib/hrStaffPurchaseCredit';
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
  buildEditApprovalInboxRows,
  buildGovernanceInboxRows,
  buildProcurementInboxRows,
  buildOrdersInboxRows,
  filterAttentionItems,
  formatRefundReasonCategory,
  matchesInboxSearch,
  normalizeManagerInboxRoute,
  ymdLocal,
} from '../lib/managerDashboardCore';
import { isEffectivelyFullyPaid } from '../lib/paymentOutstandingTolerance';
import { formatPersonName } from '../lib/formatPersonName';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { syncAccountingPolicyFlagsFromHealth, deliveryPaymentGateMode } from '../lib/accountingPolicyFlags';
import { userMayApproveRefundRequests } from '../lib/refundsStore';
import {
  canApproveProductionGate,
  productionGateOverrideDeniedMessage,
  productionGateOverrideNoteValid,
} from '../lib/productionGateAccess';
import {
  userMayPerformManagerQuotationClearance,
  userMayReleaseQuotationPaymentHold,
  userMayWriteOffReceivableBadDebt,
} from '../lib/workspaceGovernanceClient';
import { RECEIVABLE_WRITEOFF_NOTE_MIN_LEN } from '../lib/receivableWriteOffPolicy';
import { canMarkHrAttendance } from '../lib/hrAccess';
import { useCreditExceptions } from './useCreditExceptions';
import {
  buildBranchHealthSignals,
  buildManagerTargetSourceMeta,
  computeBranchOpenActionCount,
} from '../lib/branchManagerWorkstation';

const INITIAL_REMARK_DIALOG = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Submit',
  minLength: 0,
  optional: false,
  variant: 'default',
  onSubmit: '',
  resolverKey: '',
};

const INITIAL_CONFIRM_DIALOG = {
  open: false,
  title: '',
  description: '',
  onConfirm: '',
  resolverKey: '',
};

function buildResolverKey(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readStaffUserId(row) {
  return String(row?.userId || row?.staffUserId || row?.staff_id || '').trim();
}

export function useBranchManagerWorkstation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteDeepLinked = useRef('');
  const poDeepLinked = useRef('');
  const refundDeepLinked = useRef('');
  const jobDeepLinked = useRef('');
  const requestDeepLinked = useRef('');
  const materialIncidentDeepLinked = useRef('');
  const editApprovalDeepLinked = useRef('');
  const managerQueuesHydratedRef = useRef(false);
  const lastRefundIntelQrefRef = useRef('');
  const remarkResolversRef = useRef(new Map());
  const confirmResolversRef = useRef(new Map());
  const ws = useWorkspace();
  const { products: invProducts } = useInventory();
  const { show: showToast } = useToast();

  const showAttendanceTab = canMarkHrAttendance(ws?.permissions);
  const managerRoleKey = String(ws?.session?.user?.roleKey || '').toLowerCase();
  const showDeliveryCreditTab = ['md', 'admin', 'sales_manager', 'finance_manager'].includes(managerRoleKey);
  const managerInboxTabs = useMemo(
    () => MANAGER_INBOX_TABS.filter((t) => t.key !== 'credit' || showDeliveryCreditTab),
    [showDeliveryCreditTab]
  );

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
    pendingPurchaseOrders: [],
  });
  /** @type {[null | { kind: string; quoteId?: string; refundId?: string; requestId?: string; jobId?: string; materialIncidentId?: string; row: object; cuttingListId?: string; fromProductionGate?: boolean; reviewContext?: string }, Function]} */
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
  const [attentionSummary, setAttentionSummary] = useState(null);
  const [poAuditData, setPoAuditData] = useState(null);
  const [loadingPoAudit, setLoadingPoAudit] = useState(false);
  const [deliveryGateMode, setDeliveryGateMode] = useState('off');
  const [editApprovalModal, setEditApprovalModal] = useState({ open: false, id: '', row: null });
  const [editApprovalPending, setEditApprovalPending] = useState([]);
  const [conversionSignoffRemark, setConversionSignoffRemark] = useState('');
  const [conversionSignoffEditApprovalId, setConversionSignoffEditApprovalId] = useState('');
  const [showExpenseCorrectionModal, setShowExpenseCorrectionModal] = useState(false);
  const [savingExpenseCorrection, setSavingExpenseCorrection] = useState(false);
  const [editingPaymentRequestId, setEditingPaymentRequestId] = useState('');
  const [expenseCorrectionForm, setExpenseCorrectionForm] = useState(() => initialExpenseRequestFormState());
  const [attendancePendingCount, setAttendancePendingCount] = useState(0);
  const [remarkDialog, setRemarkDialog] = useState(INITIAL_REMARK_DIALOG);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(INITIAL_CONFIRM_DIALOG);
  const payRequestFileRef = useRef(null);
  /** @type {['month' | '4months' | 'half' | 'year', Function]} */
  const [metricPeriod, setMetricPeriod] = useState('month');

  const canApproveEdits = userCanApproveEditMutationsClient(ws?.session?.user?.roleKey, ws?.permissions);
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
  const canWriteOffBadDebt = userMayWriteOffReceivableBadDebt(ws?.session?.user);
  const canApproveRefunds = userMayApproveRefundRequests(ws);
  const canApproveStaffPurchaseCreditMd = canApproveStaffPurchaseCredit(managerRoleKey, ws?.permissions);
  const canRejectStaffPurchaseCreditMd = canRejectStaffPurchaseCredit(managerRoleKey, ws?.permissions);
  const canApproveMaterialIncidents =
    Boolean(ws?.hasPermission?.('material_incidents.approve')) || canManagerClearance;

  const { items: creditExceptionItems } = useCreditExceptions({
    branchId: ws?.workspaceBranchId || ws?.session?.branchId || null,
    enabled: showDeliveryCreditTab,
  });
  const pendingCreditCount = useMemo(
    () => creditExceptionItems.filter((i) => i.status === 'pending').length,
    [creditExceptionItems]
  );

  const requestRemark = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      const resolverKey = buildResolverKey('remark');
      const callbackKey = String(opts.onSubmit || '').trim() || resolverKey;
      remarkResolversRef.current.set(resolverKey, resolve);
      setRemarkDraft(String(opts.initialValue || ''));
      setRemarkDialog({
        open: true,
        title: String(opts.title || ''),
        description: String(opts.description || ''),
        confirmLabel: String(opts.confirmLabel || 'Submit'),
        minLength: Math.max(0, Number(opts.minLength) || 0),
        optional: Boolean(opts.optional),
        variant: String(opts.variant || 'default'),
        onSubmit: callbackKey,
        resolverKey,
      });
    });
  }, []);

  const cancelRemarkDialog = useCallback(() => {
    const resolver = remarkResolversRef.current.get(remarkDialog.resolverKey);
    if (resolver) {
      resolver({ ok: false, value: '', key: remarkDialog.onSubmit });
      remarkResolversRef.current.delete(remarkDialog.resolverKey);
    }
    setRemarkDraft('');
    setRemarkDialog(INITIAL_REMARK_DIALOG);
  }, [remarkDialog.onSubmit, remarkDialog.resolverKey]);

  const submitRemarkDialog = useCallback(() => {
    const value = String(remarkDraft || '').trim();
    const minLength = Math.max(0, Number(remarkDialog.minLength) || 0);
    if (!remarkDialog.optional && value.length < minLength) {
      const minWord = minLength === 1 ? 'character' : 'characters';
      showToast(`Please enter at least ${minLength} ${minWord}.`, { variant: 'error' });
      return;
    }
    if (remarkDialog.optional && value.length > 0 && value.length < minLength) {
      const minWord = minLength === 1 ? 'character' : 'characters';
      showToast(`If provided, remark must be at least ${minLength} ${minWord}.`, { variant: 'error' });
      return;
    }
    const resolver = remarkResolversRef.current.get(remarkDialog.resolverKey);
    if (resolver) {
      resolver({ ok: true, value, key: remarkDialog.onSubmit });
      remarkResolversRef.current.delete(remarkDialog.resolverKey);
    }
    setRemarkDraft('');
    setRemarkDialog(INITIAL_REMARK_DIALOG);
  }, [
    remarkDraft,
    remarkDialog.minLength,
    remarkDialog.onSubmit,
    remarkDialog.optional,
    remarkDialog.resolverKey,
    showToast,
  ]);

  const requestConfirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      const resolverKey = buildResolverKey('confirm');
      const callbackKey = String(opts.onConfirm || '').trim() || resolverKey;
      confirmResolversRef.current.set(resolverKey, resolve);
      setConfirmDialog({
        open: true,
        title: String(opts.title || ''),
        description: String(opts.description || ''),
        onConfirm: callbackKey,
        resolverKey,
      });
    });
  }, []);

  const cancelConfirmDialog = useCallback(() => {
    const resolver = confirmResolversRef.current.get(confirmDialog.resolverKey);
    if (resolver) {
      resolver(false);
      confirmResolversRef.current.delete(confirmDialog.resolverKey);
    }
    setConfirmDialog(INITIAL_CONFIRM_DIALOG);
  }, [confirmDialog.resolverKey]);

  const submitConfirmDialog = useCallback(() => {
    const resolver = confirmResolversRef.current.get(confirmDialog.resolverKey);
    if (resolver) {
      resolver(true);
      confirmResolversRef.current.delete(confirmDialog.resolverKey);
    }
    setConfirmDialog(INITIAL_CONFIRM_DIALOG);
  }, [confirmDialog.resolverKey]);

  useEffect(() => {
    return () => {
      for (const resolve of remarkResolversRef.current.values()) {
        resolve({ ok: false, value: '', key: '' });
      }
      remarkResolversRef.current.clear();
      for (const resolve of confirmResolversRef.current.values()) {
        resolve(false);
      }
      confirmResolversRef.current.clear();
    };
  }, []);

  const selectedRefundRecord = useMemo(() => {
    if (selectedIntel?.kind !== 'refund' || !selectedIntel.refundId) return null;
    const list = ws?.hasWorkspaceData && Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : [];
    return list.find((r) => String(r.refundID) === String(selectedIntel.refundId)) || null;
  }, [selectedIntel?.kind, selectedIntel?.refundId, ws?.hasWorkspaceData, ws?.snapshot?.refunds]);

  const intelModalLight =
    selectedIntel?.kind === 'refund' ||
    selectedIntel?.kind === 'quotation' ||
    selectedIntel?.kind === 'purchase_order' ||
    selectedIntel?.kind === 'payment' ||
    selectedIntel?.kind === 'conversion' ||
    selectedIntel?.kind === 'material' ||
    selectedIntel?.kind === 'governance' ||
    selectedIntel?.kind === 'staff_purchase_credit';
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
          : selectedIntel?.kind === 'payment'
            ? 'Payment request review'
            : selectedIntel?.kind === 'conversion'
              ? 'Conversion QC sign-off'
              : selectedIntel?.kind === 'material'
                ? 'Material incident review'
                : selectedIntel?.kind === 'governance'
                  ? 'Governance & risk review'
                  : selectedIntel?.kind === 'staff_purchase_credit'
                    ? 'Staff purchase credit approval'
                    : 'Transaction intel';

  const displayItems = useMemo(() => {
    if (ws?.hasWorkspaceData && ws.snapshot) {
      return buildManagementQueuesFromSnapshot(ws.snapshot);
    }
    return items;
  }, [ws?.hasWorkspaceData, ws?.snapshot, items]);

  const ordersInboxRows = useMemo(() => buildOrdersInboxRows(displayItems), [displayItems]);
  const cashOutInboxRows = useMemo(() => buildCashOutInboxRows(displayItems), [displayItems]);
  const governanceInboxRows = useMemo(
    () => buildGovernanceInboxRows(attentionItems),
    [attentionItems]
  );
  const editInboxRows = useMemo(
    () => buildEditApprovalInboxRows(editApprovalPending),
    [editApprovalPending]
  );
  const procurementInboxRows = useMemo(
    () => buildProcurementInboxRows(displayItems.pendingPurchaseOrders ?? []),
    [displayItems.pendingPurchaseOrders]
  );

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
    if (selectedIntel.kind === 'material') {
      return (
        unifiedBySource.get(`material_incident:${String(selectedIntel.materialIncidentId || '').trim()}`) ||
        unifiedBySource.get(`material_exception:${String(selectedIntel.materialIncidentId || '').trim()}`) ||
        null
      );
    }
    return null;
  }, [selectedIntel, unifiedBySource]);

  const officialRecordFallbackId = useMemo(() => {
    if (!selectedIntel) return '';
    if (selectedIntel.kind === 'quotation') return String(selectedIntel.quoteId || '').trim();
    if (selectedIntel.kind === 'refund') return String(selectedIntel.row?.quotation_ref || '').trim();
    if (selectedIntel.kind === 'material') return String(selectedIntel.materialIncidentId || '').trim();
    return '';
  }, [selectedIntel]);

  const paymentIntelLineItems = useMemo(() => {
    const raw = selectedIntel?.row?.line_items;
    if (!Array.isArray(raw)) return { lines: [], total: 0 };
    return { lines: raw.slice(0, 20), total: raw.length };
  }, [selectedIntel?.row?.line_items]);

  const saveExpenseCorrection = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
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
    },
    [editingPaymentRequestId, expenseCorrectionForm, savingExpenseCorrection, showToast, ws]
  );

  const liveLowStockCount = useMemo(
    () => invProducts.filter((p) => p.stockLevel < p.lowStockThreshold).length,
    [invProducts]
  );

  const workspaceQuotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.quotations) ? ws.snapshot.quotations : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.quotations]
  );
  const workspaceCuttingLists = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.cuttingLists]
  );
  const workspaceProductionJobs = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.productionJobs) ? ws.snapshot.productionJobs : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.productionJobs]
  );
  const workspaceReceipts = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.receipts]
  );
  const workspaceRefunds = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(ws.snapshot?.refunds) ? ws.snapshot.refunds : []),
    [ws?.hasWorkspaceData, ws?.snapshot?.refunds]
  );

  const mergedPrefsForTargets = useMemo(
    () => mergeDashboardPrefs(ws?.snapshot?.dashboardPrefs),
    [ws?.snapshot?.dashboardPrefs]
  );

  const managerTargetsForBuild = useMemo(() => {
    const eff = effectiveManagerTargetsPerMonth(ws?.snapshot?.orgManagerTargets, mergedPrefsForTargets);
    return { nairaTarget: eff.nairaTargetPerMonth, meterTarget: eff.meterTargetPerMonth };
  }, [ws?.snapshot?.orgManagerTargets, mergedPrefsForTargets]);

  const managerTargetSourceMeta = useMemo(
    () => buildManagerTargetSourceMeta(mergedPrefsForTargets, ws?.snapshot?.orgManagerTargets),
    [mergedPrefsForTargets, ws?.snapshot?.orgManagerTargets]
  );

  const materialIncidentQueue = useMemo(
    () => displayItems.pendingMaterialIncidents ?? [],
    [displayItems.pendingMaterialIncidents]
  );
  const procurementQueue = useMemo(
    () => displayItems.pendingPurchaseOrders ?? [],
    [displayItems.pendingPurchaseOrders]
  );
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
        topCustomers: [],
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
      metricPeriod,
      workspaceReceipts,
      workspaceRefunds
    );
  }, [
    liveLowStockCount,
    managerTargetsForBuild,
    metricPeriod,
    workspaceCuttingLists,
    workspaceProductionJobs,
    workspaceQuotations,
    workspaceReceipts,
    workspaceRefunds,
    ws?.hasWorkspaceData,
    ws?.snapshot,
  ]);

  const fetchData = useCallback(
    async ({ background = false } = {}) => {
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
            pendingPurchaseOrders: d.pendingPurchaseOrders ?? [],
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
    },
    [ws?.permissions, ws?.session?.user?.roleKey]
  );

  useEffect(() => {
    void fetchData({ background: managerQueuesHydratedRef.current });
  }, [fetchData, ws?.refreshEpoch]);

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
    let cancelled = false;
    void (async () => {
      const { ok, data } = await apiFetch('/api/stock-register/inbox?queue=manager');
      if (cancelled) return;
      if (ok && data?.ok) setStockRegisterInbox(data.items || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [mgrBranchId, ws?.refreshEpoch]);

  useEffect(() => {
    if (!showAttendanceTab || !mgrBranchId) {
      setAttendancePendingCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const dayIso = ymdLocal(new Date());
      const [staffQ, rollQ] = await Promise.all([
        apiFetch('/api/hr/staff?attendanceEligible=1'),
        apiFetch(
          `/api/hr/attendance/daily-roll?branchId=${encodeURIComponent(mgrBranchId)}&dayIso=${encodeURIComponent(dayIso)}`
        ),
      ]);
      if (cancelled) return;
      if (!staffQ.ok || !staffQ.data?.ok) {
        setAttendancePendingCount(0);
        return;
      }
      const staff = Array.isArray(staffQ.data.staff) ? staffQ.data.staff : [];
      const branchStaff = staff.filter(
        (s) =>
          String(s.branchId || s.normalized?.branchId) === String(mgrBranchId) &&
          String(s.status || '').toLowerCase() === 'active' &&
          String(s.payrollGroup || 'branch_ops') === 'branch_ops'
      );
      const rollRows =
        rollQ.ok && rollQ.data?.ok && Array.isArray(rollQ.data.roll?.rows) ? rollQ.data.roll.rows : [];
      const markedUserIds = new Set(rollRows.map(readStaffUserId).filter(Boolean));
      const pending = branchStaff.reduce((count, s) => {
        const userId = readStaffUserId(s);
        if (!userId) return count + 1;
        return markedUserIds.has(userId) ? count : count + 1;
      }, 0);
      setAttendancePendingCount(pending);
    })();
    return () => {
      cancelled = true;
    };
  }, [mgrBranchId, showAttendanceTab, ws?.refreshEpoch]);

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
    void fetchAudit(ref);
    setActiveTab('orders');
    if (fromFlagged) setAttentionFilter('flagged');
  }, [
    displayItems.flagged,
    displayItems.pendingClearance,
    displayItems.productionOverrides,
    fetchAudit,
    loading,
    searchParams,
  ]);

  useEffect(() => {
    const inbox = (searchParams.get('inbox') || '').trim();
    if (!inbox) return;
    const { tab, attentionFilter: af, redirectToTeamHr } = normalizeManagerInboxRoute(inbox);
    if (redirectToTeamHr) {
      navigate('/team-hr/time-absence?tab=attendance', { replace: true });
      return;
    }
    setActiveTab(tab);
    setAttentionFilter(af);
  }, [navigate, searchParams]);

  useEffect(() => {
    const po = (searchParams.get('poId') || searchParams.get('poID') || '').trim();
    if (!po || loading) return;
    if (poDeepLinked.current === po) return;
    poDeepLinked.current = po;
    setActiveTab('procurement');
    setSelectedIntel({ kind: 'purchase_order', poId: po, row: { poID: po } });
    void fetchPoAudit(po);
  }, [fetchPoAudit, loading, searchParams]);

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
  }, [displayItems.pendingRefunds, loading, searchParams]);

  useEffect(() => {
    const jid = (searchParams.get('jobId') || searchParams.get('jobID') || '').trim();
    if (!jid || loading) return;
    if (jobDeepLinked.current === jid) return;
    jobDeepLinked.current = jid;
    const row =
      displayItems.pendingConversionReviews.find((j) => String(j.job_id) === jid) || { job_id: jid };
    setSelectedIntel({ kind: 'conversion', jobId: jid, row: { ...row } });
    setActiveTab('qc');
  }, [displayItems.pendingConversionReviews, loading, searchParams]);

  useEffect(() => {
    const reqId = (searchParams.get('requestId') || searchParams.get('requestID') || '').trim();
    if (!reqId || loading) return;
    if (requestDeepLinked.current === reqId) return;
    requestDeepLinked.current = reqId;
    const row =
      displayItems.pendingExpenses.find((r) => String(r.request_id) === reqId) || { request_id: reqId };
    setSelectedIntel({ kind: 'payment', requestId: reqId, row: { ...row } });
    setActiveTab('cash_out');
  }, [displayItems.pendingExpenses, loading, searchParams]);

  /** Deep link: ?materialIncidentId= from workspace / notifications */
  useEffect(() => {
    const mid = (searchParams.get('materialIncidentId') || searchParams.get('materialIncidentID') || '').trim();
    if (!mid || loading) return;
    if (materialIncidentDeepLinked.current === mid) return;
    materialIncidentDeepLinked.current = mid;
    const row = materialIncidentQueue.find((r) => String(r.id) === mid) || { id: mid };
    setSelectedIntel({ kind: 'material', materialIncidentId: mid, row: { ...row } });
    setActiveTab('material');
  }, [loading, materialIncidentQueue, searchParams]);

  /** Deep link: ?editApprovalId= from workspace */
  useEffect(() => {
    const eid = (searchParams.get('editApprovalId') || searchParams.get('editApprovalID') || '').trim();
    if (!eid || loading) return;
    if (editApprovalDeepLinked.current === eid) return;
    editApprovalDeepLinked.current = eid;
    const row = editApprovalPending.find((r) => String(r.id) === eid) || { id: eid };
    setEditApprovalModal({ open: true, id: eid, row });
    setActiveTab('edits');
  }, [editApprovalPending, loading, searchParams]);

  useEffect(() => {
    setConversionSignoffRemark('');
    setConversionSignoffEditApprovalId('');
  }, [selectedIntel?.jobId, selectedIntel?.kind]);

  useEffect(() => {
    if (selectedIntel?.kind !== 'quotation') return;
    const ref = selectedIntel.quoteId;
    if (!ref || String(selectedIntel.row?.customer_name || '').trim()) return;
    const row =
      displayItems.pendingClearance.find((q) => q.id === ref) || displayItems.flagged.find((q) => q.id === ref);
    const po = displayItems.productionOverrides.find((o) => o.quotation_ref === ref);
    if (row) {
      setSelectedIntel((prev) =>
        prev?.kind === 'quotation' && prev.quoteId === ref ? { ...prev, row: { ...prev.row, ...row } } : prev
      );
    } else if (po) {
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
    }
  }, [
    displayItems.flagged,
    displayItems.pendingClearance,
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
    void (async () => {
      const { ok, data } = await apiFetch(`/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`);
      if (cancelled) return;
      setLoadingRefundIntel(false);
      if (ok && data && data.ok !== false) setRefundIntelExtras(data);
      else setRefundIntelExtras(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAudit, selectedIntelKind, selectedIntelQuoteId, selectedIntelRefundQref]);

  useEffect(() => {
    if (selectedIntel?.kind !== 'conversion') return;
    const qref = String(selectedIntel.row?.quotation_ref || '').trim();
    if (!qref) {
      setAuditData(null);
      return;
    }
    void fetchAudit(qref);
  }, [fetchAudit, selectedIntel?.jobId, selectedIntel?.kind, selectedIntel?.row?.quotation_ref]);

  useEffect(() => {
    const rk = String(ws?.session?.user?.roleKey || '').toLowerCase();
    if (!['md', 'admin', 'sales_manager'].includes(rk)) return;
    let cancelled = false;
    void (async () => {
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
      procurement: procurementInboxRows.length,
      governance: governanceInboxRows.length,
      edits: editInboxRows.length,
      attendance: attendancePendingCount,
      credit: pendingCreditCount,
      stock: stockRegisterInbox.length,
    }),
    [
      attentionItems.length,
      attendancePendingCount,
      cashOutInboxRows.length,
      displayItems.pendingConversionReviews,
      editInboxRows.length,
      governanceInboxRows.length,
      materialIncidentQueue.length,
      ordersInboxRows.length,
      pendingCreditCount,
      procurementInboxRows.length,
      stockRegisterInbox.length,
    ]
  );

  const totalOpenActions = useMemo(
    () =>
      computeBranchOpenActionCount({
        ordersCount: tabCounts.orders,
        cashOutCount: tabCounts.cash_out,
        qcCount: tabCounts.qc,
        materialCount: tabCounts.material,
        procurementCount: tabCounts.procurement,
        governanceCount: tabCounts.governance,
        editsCount: tabCounts.edits,
        creditPendingCount: tabCounts.credit,
        stockRegisterCount: stockRegisterInbox.length,
      }),
    [stockRegisterInbox.length, tabCounts]
  );

  const healthSignals = useMemo(
    () =>
      buildBranchHealthSignals({
        ordersCount: tabCounts.orders,
        cashOutCount: tabCounts.cash_out,
        qcCount: tabCounts.qc,
        materialCount: tabCounts.material,
        procurementCount: tabCounts.procurement,
        governanceCount: tabCounts.governance,
        editsCount: tabCounts.edits,
        creditPendingCount: tabCounts.credit,
        stockRegisterCount: stockRegisterInbox.length,
        lowStockCount: displaySnapshots.lowStockCount,
        attendancePendingCount,
      }),
    [attendancePendingCount, displaySnapshots.lowStockCount, stockRegisterInbox.length, tabCounts]
  );

  const filteredInboxRows = useMemo(() => {
    let list = [];
    if (activeTab === 'attention') {
      list = filterAttentionItems(attentionItems, attentionFilter);
    } else if (activeTab === 'orders') {
      list = ordersInboxRows;
    } else if (activeTab === 'cash_out') {
      list = cashOutInboxRows;
    } else if (activeTab === 'qc') {
      list = displayItems.pendingConversionReviews ?? [];
    } else if (activeTab === 'material') {
      list = materialIncidentQueue;
    } else if (activeTab === 'procurement') {
      list = procurementInboxRows;
    } else if (activeTab === 'governance') {
      list = governanceInboxRows;
    } else if (activeTab === 'edits') {
      list = editInboxRows;
    } else {
      list = [];
    }
    return list.filter((row) => matchesInboxSearch(inboxSearch, row, activeTab));
  }, [
    activeTab,
    attentionFilter,
    attentionItems,
    cashOutInboxRows,
    displayItems.pendingConversionReviews,
    editInboxRows,
    governanceInboxRows,
    inboxSearch,
    materialIncidentQueue,
    ordersInboxRows,
    procurementInboxRows,
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
      void fetchAudit(quotationId);
    },
    [fetchAudit]
  );

  const openMaterialIncidentIntel = useCallback((row) => {
    if (!row?.id) return;
    setSelectedIntel({
      kind: 'material',
      materialIncidentId: String(row.id),
      row: { ...row },
    });
    setActiveTab('material');
  }, []);

  const openPurchaseOrderIntel = useCallback(
    (row) => {
      const poId = String(row?.po_id || row?.poID || row?.id || '').trim();
      if (!poId) return;
      setAuditData(null);
      setRefundIntelExtras(null);
      setSelectedIntel({ kind: 'purchase_order', poId, row: { poID: poId, ...row } });
      setActiveTab('procurement');
      void fetchPoAudit(poId);
    },
    [fetchPoAudit]
  );

  const openGovernanceIntel = useCallback((item) => {
    if (!item) return;
    setSelectedIntel({
      kind: 'governance',
      governanceId: item.id,
      row: item.row || {},
      item: { ...item },
    });
    setActiveTab('governance');
  }, []);

  const openEditApprovalIntel = useCallback((row) => {
    const id = String(row?.id || '').trim();
    if (!id) return;
    setEditApprovalModal({ open: true, id, row: row || null });
    setActiveTab('edits');
  }, []);

  const closeEditApprovalModal = useCallback(() => {
    setEditApprovalModal({ open: false, id: '', row: null });
  }, []);

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
        openMaterialIncidentIntel(item.row || row);
        return;
      }
      if (kind === 'edit_approvals') {
        openEditApprovalIntel(item.row || row);
        return;
      }
      if (kind === 'governance') {
        openGovernanceIntel(item);
        return;
      }
      if (kind === 'staff_purchase_credit') {
        setAuditData(null);
        setRefundIntelExtras(null);
        setSelectedIntel({
          kind: 'staff_purchase_credit',
          accountId: item.accountId || row.id,
          quotationRef: item.quotationRef || row.quotationRef,
          row: { ...row },
        });
        setActiveTab('attention');
        return;
      }
      if (item.poId) {
        const po = item.poId;
        openPurchaseOrderIntel({ po_id: po, ...row });
      }
    },
    [openEditApprovalIntel, openGovernanceIntel, openMaterialIncidentIntel, openPurchaseOrderIntel, openQuotationIntel]
  );

  const handleReview = useCallback(
    async (quotationId, decision, reason = '') => {
      if (!quotationId) return;
      if ((decision === 'clear' || decision === 'flag' || decision === 'waive_balance') && !canManagerClearance) {
        showToast('Quotation clearance requires Branch Manager, MD, or Administrator authority.', {
          variant: 'error',
        });
        return;
      }
      if (decision === 'release_payments' && !canReleasePaymentHolds) {
        showToast('Releasing payment holds requires Managing Director or Administrator authority.', {
          variant: 'error',
        });
        return;
      }
      if (decision === 'release_payments') {
        const confirmed = await requestConfirm({
          title: 'Release payment hold',
          description:
            'Sales will be able to post receipts again until this quotation is cleared or flagged. Continue?',
          onConfirm: 'release_payments',
        });
        if (!confirmed) return;
      }
      if (decision === 'waive_balance') {
        const confirmed = await requestConfirm({
          title: 'Waive round-off',
          description:
            'Waive only the small balance within the 99.5% payment tolerance (max ₦5,000). This removes it from Creditors receivables and posts a GL write-off. Continue?',
          onConfirm: 'waive_balance',
        });
        if (!confirmed) return;
      }
      if (decision === 'write_off_receivable') {
        if (!canWriteOffBadDebt) {
          showToast('Material receivable write-off requires Managing Director or Administrator authority.', {
            variant: 'error',
          });
          return;
        }
        const prompted = await requestRemark({
          title: 'Write off receivable',
          description:
            'Document why this balance is uncollectible or settled. Customer underpayment cannot use round-off — this is an audited MD write-off.',
          confirmLabel: 'Write off',
          minLength: RECEIVABLE_WRITEOFF_NOTE_MIN_LEN,
          optional: false,
          variant: 'warning',
          onSubmit: 'write_off_receivable_reason',
        });
        if (!prompted?.ok) return;
        reason = String(prompted.value || '').trim();
      }
      if (decision === 'flag' && !String(reason || '').trim()) {
        const flagged = await requestRemark({
          title: 'Reason for audit flag',
          description: 'Provide a reason for moving this quotation to the flagged queue.',
          confirmLabel: 'Flag quotation',
          minLength: 3,
          optional: false,
          variant: 'warning',
          onSubmit: 'flag_quotation_reason',
        });
        if (!flagged?.ok) return;
        reason = flagged.value;
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
          const prompted = await requestRemark({
            title: 'Production override reason',
            description: 'Why may production proceed below the payment threshold?',
            confirmLabel: 'Save override',
            minLength: 8,
            optional: false,
            variant: 'warning',
            onSubmit: 'production_override_reason',
          });
          if (!prompted?.ok) return;
          overrideReason = String(prompted.value || '').trim();
        }
        if (!productionGateOverrideNoteValid(overrideReason)) {
          showToast('Override reason must be at least 8 characters.', { variant: 'error' });
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
        waive_balance: data?.waivedAmountNgn
          ? `Round-off waived — ₦${Number(data.waivedAmountNgn).toLocaleString('en-NG')} removed from receivables.`
          : 'Round-off waived.',
        write_off_receivable: data?.waivedAmountNgn
          ? `Receivable written off — ₦${Number(data.waivedAmountNgn).toLocaleString('en-NG')} (${data?.writeOffCategory || 'bad_debt'}).`
          : 'Receivable written off.',
      };
      showToast(labels[decision] || 'Updated.', { variant: 'success' });
      await fetchData();
      await (ws.refresh?.() ?? Promise.resolve());
      if (selectedIntel?.kind === 'quotation' && selectedIntel.quoteId === quotationId) {
        setSelectedIntel(null);
        setAuditData(null);
      }
    },
    [
      canManagerClearance,
      canReleasePaymentHolds,
      canWriteOffBadDebt,
      fetchData,
      items.pendingClearance,
      items.productionOverrides,
      requestConfirm,
      requestRemark,
      selectedIntel,
      showToast,
      ws,
    ]
  );

  const handleClearAllClearance = useCallback(async () => {
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
    const ok = await requestConfirm({
      title: 'Approve all paid quotations?',
      description: `Approve order sign-off for ${eligible.length} quotation(s)? Each quote is reviewed individually; bulk clear applies only to quotes at 99.5% paid or above.${skipNote}`,
      onConfirm: 'clear_all_clearance',
    });
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
  }, [canManagerClearance, fetchData, filteredInboxRows, requestConfirm, showToast, ws]);

  const handleRefundDecision = useCallback(
    async (status, decisionExtras = {}) => {
      if (selectedIntel?.kind !== 'refund') return;
      let note = '';
      if (decisionExtras.inlineManagerNote) {
        note = String(decisionExtras.managerComments ?? '').trim();
        if (status === 'Rejected' && note.length < 3) {
          showToast('Enter a rejection reason (at least 3 characters).', { variant: 'error' });
          return;
        }
      } else {
        const asked = await requestRemark({
          title: status === 'Approved' ? 'Approval note (optional)' : 'Rejection reason (optional)',
          description:
            status === 'Approved'
              ? 'Add an optional manager note for this refund approval.'
              : 'Add an optional reason for rejecting this refund.',
          confirmLabel: status === 'Approved' ? 'Approve refund' : 'Reject refund',
          minLength: 0,
          optional: true,
          variant: status === 'Approved' ? 'default' : 'warning',
          onSubmit: 'refund_decision_note',
        });
        if (!asked?.ok) return;
        note = String(asked.value || '').trim();
      }
      const fallbackAmount = Number(selectedIntel.row?.amount_ngn) || 0;
      const amount =
        status === 'Approved'
          ? Math.round(Number(decisionExtras.approvedAmountNgn) || fallbackAmount)
          : 0;
      setDecisionBusy(true);
      const { ok, data } = await apiFetch(
        `/api/refunds/${encodeURIComponent(selectedIntel.refundId)}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({
            status,
            managerComments: note,
            ...(status === 'Approved' && amount > 0 ? { approvedAmountNgn: amount } : {}),
            ...(status === 'Approved' && Array.isArray(decisionExtras.calculationLines) && decisionExtras.calculationLines.length
              ? { calculationLines: decisionExtras.calculationLines }
              : {}),
            ...(status === 'Approved'
              ? {
                  productionAlignmentAcknowledgedCodes:
                    decisionExtras.productionAlignmentAcknowledgedCodes || [],
                  productionAlignmentOverrideNote: decisionExtras.productionAlignmentOverrideNote || '',
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
    },
    [fetchData, requestRemark, selectedIntel, showToast, ws]
  );

  const handleStaffPurchaseCreditDecision = useCallback(
    async (decision, rejectNote = '') => {
      if (selectedIntel?.kind !== 'staff_purchase_credit') return;
      const accountId = String(selectedIntel.accountId || selectedIntel.row?.id || '').trim();
      if (!accountId) return;
      if (decision === 'approve' && !canApproveStaffPurchaseCreditMd) {
        showToast('Only the Managing Director can approve staff purchase credit.', { variant: 'error' });
        return;
      }
      if (decision === 'reject' && !canRejectStaffPurchaseCreditMd) {
        showToast('You cannot reject this purchase credit request.', { variant: 'error' });
        return;
      }
      let note = String(rejectNote || '').trim();
      if (decision === 'reject' && note.length < 3) {
        const asked = await requestRemark({
          title: 'Rejection reason (required)',
          description: 'Staff purchase credit rejections require a brief reason for Sales and the staff member.',
          confirmLabel: 'Reject purchase credit',
          minLength: 3,
          optional: false,
          variant: 'warning',
          onSubmit: 'staff_purchase_credit_reject',
        });
        if (!asked?.ok) return;
        note = String(asked.value || '').trim();
        if (note.length < 3) {
          showToast('Rejection reason is required (at least 3 characters).', { variant: 'error' });
          return;
        }
      }
      setDecisionBusy(true);
      try {
        const { ok, data } = await decideStaffPurchaseCredit(accountId, decision, {
          note: decision === 'approve' ? 'Approved by MD (command center)' : note,
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Action failed.', { variant: 'error' });
          return;
        }
        showToast(decision === 'approve' ? 'Staff purchase credit approved.' : 'Staff purchase credit rejected.', {
          variant: 'success',
        });
        await fetchData({ background: true });
        await (ws.refresh?.() ?? Promise.resolve());
        await (ws.refreshStaffPurchaseCreditPending?.() ?? Promise.resolve());
        setSelectedIntel(null);
      } finally {
        setDecisionBusy(false);
      }
    },
    [
      canApproveStaffPurchaseCreditMd,
      canRejectStaffPurchaseCreditMd,
      fetchData,
      requestRemark,
      selectedIntel,
      showToast,
      ws,
    ]
  );

  const handlePaymentDecision = useCallback(
    async (status) => {
      if (selectedIntel?.kind !== 'payment') return;
      const asked = await requestRemark({
        title: status === 'Approved' ? 'Approval note (optional)' : 'Rejection reason (optional)',
        description:
          status === 'Approved'
            ? 'Add an optional manager note for this payment request.'
            : 'Add an optional reason for rejecting this payment request.',
        confirmLabel: status === 'Approved' ? 'Approve request' : 'Reject request',
        minLength: 0,
        optional: true,
        variant: status === 'Approved' ? 'default' : 'warning',
        onSubmit: 'payment_decision_note',
      });
      if (!asked?.ok) return;
      const note = String(asked.value || '').trim();
      setDecisionBusy(true);
      const { ok, data } = await apiFetch(
        `/api/payment-requests/${encodeURIComponent(selectedIntel.requestId)}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({ status, note }),
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
    },
    [fetchData, requestRemark, selectedIntel, showToast, ws]
  );

  const handleConversionSignoff = useCallback(async () => {
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
  }, [conversionSignoffEditApprovalId, conversionSignoffRemark, fetchData, selectedIntel, showToast, ws]);

  const handleDisapproveSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'flag');
  }, [handleReview, selectedIntel]);

  const handleFlagSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'flag');
  }, [handleReview, selectedIntel]);

  const handleReleasePaymentsSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'release_payments');
  }, [handleReview, selectedIntel]);

  const handleWaiveBalanceSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'waive_balance');
  }, [handleReview, selectedIntel]);

  const handleWriteOffReceivableSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'write_off_receivable');
  }, [handleReview, selectedIntel]);

  const handleProductionOverrideSelectedQuotation = useCallback(async () => {
    if (selectedIntel?.kind !== 'quotation') return;
    await handleReview(selectedIntel.quoteId, 'approve_production');
  }, [handleReview, selectedIntel]);

  const closeIntelModal = useCallback(() => {
    setSelectedIntel(null);
    setAuditData(null);
    setRefundIntelExtras(null);
    // Allow the same deep-link (e.g. from search) to reopen after close.
    quoteDeepLinked.current = '';
    refundDeepLinked.current = '';
    poDeepLinked.current = '';
    jobDeepLinked.current = '';
    requestDeepLinked.current = '';
    materialIncidentDeepLinked.current = '';
    editApprovalDeepLinked.current = '';
    const params = new URLSearchParams(searchParams);
    let changed = false;
    for (const key of [
      'quoteRef',
      'refundId',
      'refundID',
      'poId',
      'poID',
      'jobId',
      'jobID',
      'requestId',
      'requestID',
      'materialIncidentId',
      'materialIncidentID',
      'editApprovalId',
      'editApprovalID',
    ]) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const qs = params.toString();
      navigate(qs ? `/manager?${qs}` : '/manager', { replace: true });
    }
  }, [navigate, searchParams]);

  const openMaterialIncidentOperations = useCallback(
    (row) => {
      const incidentId = String(row?.id || selectedIntel?.materialIncidentId || '').trim();
      if (!incidentId) return;
      navigate('/operations', {
        state: { focusOpsTab: 'materialExceptions', materialIncidentId: incidentId },
      });
    },
    [navigate, selectedIntel?.materialIncidentId]
  );

  const openProcurementDesk = useCallback(() => {
    navigate('/procurement');
  }, [navigate]);

  const openGovernanceLinkedRefund = useCallback((refundId) => {
    const id = String(refundId || '').trim();
    if (!id) return;
    setAuditData(null);
    setRefundIntelExtras(null);
    setSelectedIntel({
      kind: 'refund',
      refundId: id,
      row: { refund_id: id },
    });
    setActiveTab('cash_out');
  }, []);

  const openGovernanceLinkedQuotation = useCallback(
    (quotationRef) => {
      const qref = String(quotationRef || '').trim();
      if (!qref) return;
      openQuotationIntel(qref, { id: qref }, { fromProductionGate: true });
      setActiveTab('orders');
    },
    [openQuotationIntel]
  );

  const openGovernanceLinkedProductionQc = useCallback((jobId) => {
    const jid = String(jobId || '').trim();
    if (!jid) return;
    setAuditData(null);
    setRefundIntelExtras(null);
    setSelectedIntel({ kind: 'conversion', jobId: jid, row: { job_id: jid } });
    setActiveTab('qc');
  }, []);

  const handleApproveEditApproval = useCallback(
    async (editApprovalId) => {
      const id = String(editApprovalId || '').trim();
      if (!id) return;
      const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}/approve`, {
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
    },
    [fetchData, showToast, ws]
  );

  const selectedPaymentAttachmentUrl = useMemo(() => {
    if (selectedIntel?.kind !== 'payment' || !selectedIntel.requestId) return '';
    return apiUrl(`/api/payment-requests/${encodeURIComponent(selectedIntel.requestId)}/attachment`);
  }, [selectedIntel]);

  const printSelectedPaymentRequest = useCallback(() => {
    if (selectedIntel?.kind !== 'payment') return;
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
    );
  }, [selectedIntel]);

  const tabMeta = useMemo(
    () => managerInboxTabs.find((t) => t.key === activeTab),
    [activeTab, managerInboxTabs]
  );

  return {
    ws,
    navigate,
    searchParams,
    showAttendanceTab,
    showDeliveryCreditTab,
    managerRoleKey,
    managerInboxTabs,
    managerTargetSourceMeta,
    healthSignals,
    loading,
    setLoading,
    loadError,
    setLoadError,
    stockRegisterMgrOpen,
    setStockRegisterMgrOpen,
    stockRegisterInbox,
    setStockRegisterInbox,
    items,
    setItems,
    selectedIntel,
    setSelectedIntel,
    auditData,
    setAuditData,
    refundIntelExtras,
    setRefundIntelExtras,
    loadingAudit,
    setLoadingAudit,
    loadingRefundIntel,
    setLoadingRefundIntel,
    decisionBusy,
    setDecisionBusy,
    inboxSearch,
    setInboxSearch,
    activeTab,
    setActiveTab,
    attentionFilter,
    setAttentionFilter,
    attentionItems,
    setAttentionItems,
    attentionSummary,
    setAttentionSummary,
    poAuditData,
    setPoAuditData,
    loadingPoAudit,
    setLoadingPoAudit,
    deliveryGateMode,
    setDeliveryGateMode,
    editApprovalPending,
    setEditApprovalPending,
    conversionSignoffRemark,
    setConversionSignoffRemark,
    conversionSignoffEditApprovalId,
    setConversionSignoffEditApprovalId,
    showExpenseCorrectionModal,
    setShowExpenseCorrectionModal,
    savingExpenseCorrection,
    setSavingExpenseCorrection,
    editingPaymentRequestId,
    setEditingPaymentRequestId,
    expenseCorrectionForm,
    setExpenseCorrectionForm,
    attendancePendingCount,
    setAttendancePendingCount,
    remarkDialog,
    setRemarkDialog,
    remarkDraft,
    setRemarkDraft,
    confirmDialog,
    setConfirmDialog,
    payRequestFileRef,
    metricPeriod,
    setMetricPeriod,
    showExecProdShortcut,
    showExecInvShortcut,
    canExecInvOpenAdjust,
    showBiShortcut,
    canApprovePaymentRequests,
    canManagerClearance,
    canReleasePaymentHolds,
    canWriteOffBadDebt,
    canApproveRefunds,
    canApproveStaffPurchaseCreditMd,
    canRejectStaffPurchaseCreditMd,
    canApproveMaterialIncidents,
    creditExceptionItems,
    pendingCreditCount,
    selectedRefundRecord,
    intelModalLight,
    intelModalTitle,
    displayItems,
    ordersInboxRows,
    cashOutInboxRows,
    governanceInboxRows,
    editInboxRows,
    procurementInboxRows,
    procurementQueue,
    unifiedWorkItems,
    unifiedBySource,
    openUnifiedWorkItem,
    selectedUnifiedWorkItem,
    officialRecordFallbackId,
    paymentIntelLineItems,
    saveExpenseCorrection,
    liveLowStockCount,
    workspaceQuotations,
    workspaceCuttingLists,
    workspaceProductionJobs,
    mergedPrefsForTargets,
    managerTargetsForBuild,
    materialIncidentQueue,
    pendingOrderSignOffCount,
    displaySnapshots,
    fetchData,
    mgrBranchId,
    mgrBranchLabel,
    fetchAudit,
    fetchPoAudit,
    tabCounts,
    totalOpenActions,
    filteredInboxRows,
    producedSalesProgress,
    productionMetresProgress,
    openQuotationIntel,
    openMaterialIncidentIntel,
    openPurchaseOrderIntel,
    openGovernanceIntel,
    openEditApprovalIntel,
    closeEditApprovalModal,
    editApprovalModal,
    canApproveEdits,
    openAttentionItem,
    handleReview,
    handleClearAllClearance,
    handleRefundDecision,
    handleStaffPurchaseCreditDecision,
    handlePaymentDecision,
    handleConversionSignoff,
    handleDisapproveSelectedQuotation,
    handleFlagSelectedQuotation,
    handleReleasePaymentsSelectedQuotation,
    handleWaiveBalanceSelectedQuotation,
    handleWriteOffReceivableSelectedQuotation,
    handleProductionOverrideSelectedQuotation,
    closeIntelModal,
    openMaterialIncidentOperations,
    openGovernanceLinkedRefund,
    openGovernanceLinkedQuotation,
    openGovernanceLinkedProductionQc,
    openProcurementDesk,
    handleApproveEditApproval,
    requestRemark,
    cancelRemarkDialog,
    submitRemarkDialog,
    requestConfirm,
    cancelConfirmDialog,
    submitConfirmDialog,
    selectedPaymentAttachmentUrl,
    printSelectedPaymentRequest,
    tabMeta,
    managementPeriodStartISO,
    MANAGER_METRIC_PERIODS,
    MANAGER_ATTENTION_FILTERS,
    formatRefundReasonCategory,
    filterAttentionItems,
    matchesInboxSearch,
    formatNgn,
    formatPersonName,
    showToast,
  };
}

