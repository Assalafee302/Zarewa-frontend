import { getManagementQueueCounts } from './managementQueueCounts.js';
import {
  ATTENTION_ROW_ALERT_LIMIT,
  pushAttentionRowAlerts,
} from './attentionRowNotifications.js';
import { countLowStockFromSnapshot } from './lowStockFromSnapshot.js';
import {
  quotationIsFlaggedForAudit,
  quotationIsOverdueForCollections,
  quotationNeedsManagerClearance,
} from './managementQueueFilters.js';
import { approvedRefundsAwaitingPayment } from './refundsStore.js';
import { formatPersonName } from './formatPersonName.js';
import {
  userMaySeeManagementApprovalQueues,
  userMaySeeRefundApprovalQueue,
  workItemIsPersonalForUser,
  workItemShowsOnWorkspaceUnifiedInbox,
} from './workItemPersonalInbox.js';
import { userCanApproveEditMutationsClient } from './editApprovalUi.js';
import { workItemNeedsActionForUser } from './workspaceInboxBuckets.js';

/** Max alerts shown in the bell dropdown (sorted by priority). */
export const WORKSPACE_NOTIFICATION_DISPLAY_LIMIT = 10;

/** @typedef {'critical' | 'warning' | 'info'} NotificationSeverity */

/**
 * @param {NotificationSeverity} severity
 * @returns {number}
 */
export function notificationPriorityScore(severity) {
  if (severity === 'critical') return 100;
  if (severity === 'warning') return 70;
  return 40;
}

/**
 * @param {object[]} items
 * @returns {object[]}
 */
export function sortWorkspaceNotifications(items) {
  return [...items].sort((a, b) => {
    const pa = Number(a.priority) || notificationPriorityScore(a.severity);
    const pb = Number(b.priority) || notificationPriorityScore(b.severity);
    if (pb !== pa) return pb - pa;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
}

/** @param {string[]} labels @param {number} [maxShown] */
export function formatNotificationPreview(labels, maxShown = 2) {
  const clean = labels.map((s) => String(s || '').trim()).filter(Boolean);
  if (clean.length === 0) return '';
  const head = clean.slice(0, maxShown).join(', ');
  const rest = clean.length - maxShown;
  return rest > 0 ? `${head} +${rest} more` : head;
}

/**
 * @param {object | null | undefined} snapshot
 * @param {(q: object) => boolean} filter
 * @param {(q: object) => string} labelFn
 */
function quotationPreviewFromSnapshot(snapshot, filter, labelFn, maxShown = 2) {
  const quotations = Array.isArray(snapshot?.quotations) ? snapshot.quotations : [];
  const labels = quotations.filter(filter).map(labelFn);
  return formatNotificationPreview(labels, maxShown);
}

/**
 * Branch manager / approval desk — mirrors Manager dashboard queues.
 * @param {object} params
 */
function pushBranchManagerAlerts(items, { snapshot, roleKey, hasPermission, managementAttention }) {
  const permissions = snapshot?.permissions ?? snapshot?.session?.permissions ?? [];
  const canMgmt = userMaySeeManagementApprovalQueues(roleKey, permissions);
  const canRefund = userMaySeeRefundApprovalQueue(permissions);
  const canFinanceApprove = hasPermission('finance.approve');

  if (!canMgmt && !canRefund && !canFinanceApprove) return;

  const hasAttentionRows = pushAttentionRowAlerts(items, { managementAttention, snapshot });

  const attentionItems = Array.isArray(managementAttention?.items) ? managementAttention.items : [];
  const attentionTotal = Number(managementAttention?.summary?.total) || attentionItems.length;
  const attentionRowsShown = hasAttentionRows
    ? Math.min(ATTENTION_ROW_ALERT_LIMIT, attentionItems.length || ATTENTION_ROW_ALERT_LIMIT)
    : 0;

  const queues = getManagementQueueCounts(snapshot || {});
  const signOff = queues.signOff;
  const flagged = queues.flagged;
  const prodGate = queues.prodGate;

  if (canMgmt && hasAttentionRows && attentionTotal > attentionRowsShown) {
    items.push({
      id: 'mgr-more-attention',
      category: 'manager',
      title: 'More on manager desk',
      detail: `${attentionTotal - attentionRowsShown} additional prioritized item(s) on Everything — open the full queue.`,
      severity: 'info',
      priority: 44,
      path: '/manager?tab=today&inbox=attention',
      state: {},
    });
  }

  if (canMgmt && (signOff > 0 || flagged > 0 || prodGate > 0) && !hasAttentionRows) {
    const parts = [];
    if (signOff > 0) parts.push(`${signOff} awaiting sign-off`);
    if (flagged > 0) parts.push(`${flagged} flagged for audit`);
    if (prodGate > 0) parts.push(`${prodGate} production gate`);
    const clearancePreview = quotationPreviewFromSnapshot(
      snapshot,
      (q) => quotationNeedsManagerClearance(q),
      (q) => `${q.id} · ${formatPersonName(q.customer)}`
    );
    const flaggedPreview = quotationPreviewFromSnapshot(
      snapshot,
      (q) => quotationIsFlaggedForAudit(q),
      (q) => `${q.id} · ${formatPersonName(q.customer)}`
    );
    const preview = flaggedPreview || clearancePreview;
    items.push({
      id: 'mgr-order-review',
      category: 'manager',
      title: 'Order review',
      detail: preview
        ? `${parts.join(' · ')} — e.g. ${preview}. Every paid quote needs branch manager clearance.`
        : `${parts.join(' · ')}. Paid quotes from the sales office need branch manager review — with or without a refund.`,
      severity: flagged > 0 ? 'critical' : 'warning',
      priority: flagged > 0 ? 95 : 82,
      path: '/manager?tab=today&inbox=orders',
      state: {},
    });
  }

  const pendingRefundApprove = queues.pendingRefunds;
  const pendingExpenseApprove = queues.pendingExpenses;
  if ((canRefund || canFinanceApprove) && (pendingRefundApprove > 0 || pendingExpenseApprove > 0) && !hasAttentionRows) {
    const parts = [];
    if (pendingRefundApprove > 0) parts.push(`${pendingRefundApprove} refund(s) to approve`);
    if (pendingExpenseApprove > 0) parts.push(`${pendingExpenseApprove} expense(s) to approve`);
    const refunds = Array.isArray(snapshot?.refunds) ? snapshot.refunds : [];
    const paymentRequests = Array.isArray(snapshot?.paymentRequests) ? snapshot.paymentRequests : [];
    const cashPreview = formatNotificationPreview([
      ...refunds
        .filter((r) => String(r.status) === 'Pending')
        .map((r) => `${r.refundID || r.refund_id} · ${formatPersonName(r.customer)}`),
      ...paymentRequests
        .filter((pr) => String(pr.approvalStatus || '').toLowerCase() === 'pending')
        .map((pr) => pr.description || pr.requestID || pr.request_id || 'Expense'),
    ]);
    items.push({
      id: 'mgr-cash-out',
      category: 'manager',
      title: 'Cash out',
      detail: cashPreview ? `${parts.join(' · ')} — e.g. ${cashPreview}` : parts.join(' · '),
      severity: 'warning',
      priority: 88,
      path: '/manager?tab=today&inbox=cash_out',
      state: {},
    });
  }

  const qc = queues.qc;
  if (canMgmt && qc > 0) {
    items.push({
      id: 'mgr-production-qc',
      category: 'manager',
      title: 'Production QC',
      detail: `${qc} completed job(s) need conversion sign-off — separate from order sign-off.`,
      severity: 'warning',
      priority: 72,
      path: '/manager?tab=today&inbox=qc',
      state: {},
    });
  }

  const incidents = Array.isArray(snapshot?.materialIncidents) ? snapshot.materialIncidents : [];
  const pendingMex = incidents.filter((row) => String(row.status || '').trim().toLowerCase() === 'submitted');
  if (canMgmt && pendingMex.length > 0) {
    items.push({
      id: 'mgr-material-exceptions',
      category: 'manager',
      title: 'Material exceptions',
      detail: `${pendingMex.length} incident(s) awaiting branch manager approval before stock posts.`,
      severity: 'warning',
      priority: 78,
      path: '/manager?tab=today&inbox=material',
      state: {},
    });
  }

  const branchCoach = snapshot?.expenseCategoryBranchCoachAlert;
  if (canMgmt && branchCoach?.shouldCoach) {
    items.push({
      id: 'mgr-expense-others-coach',
      category: 'manager',
      title: 'Others category coaching',
      detail:
        branchCoach.message ||
        `${branchCoach.othersPct}% of branch payment requests coded Others — coach staff to use standard categories.`,
      severity: Number(branchCoach.othersPct) >= 25 ? 'warning' : 'info',
      priority: 58,
      path: '/manager',
      state: {},
    });
  }

  if (userCanApproveEditMutationsClient(roleKey, permissions)) {
    const editPending = (Array.isArray(snapshot?.unifiedWorkItems) ? snapshot.unifiedWorkItems : []).filter(
      (item) =>
        String(item?.documentType || '').trim().toLowerCase() === 'edit_approval' &&
        workItemNeedsActionForUser(item, snapshot?.session?.user?.id)
    );
    if (editPending.length > 0) {
      items.push({
        id: 'mgr-edit-approvals',
        category: 'manager',
        title: 'Edit approvals',
        detail: `${editPending.length} sensitive edit(s) waiting for second-party OK.`,
        severity: 'warning',
        priority: 80,
      path: '/manager?tab=today&inbox=edits',
      state: {},
      });
    }
  }
}

const MANAGER_QUEUE_DOC_TYPES = new Set([
  'quotation_clearance',
  'production_gate',
  'flagged_transaction',
  'conversion_review',
  'refund_request',
  'payment_request',
  'material_incident',
  'edit_approval',
]);

/**
 * Build actionable notifications from workspace snapshot, filtered by permissions.
 * @param {object} params
 * @param {object | null} params.snapshot
 * @param {(p: string) => boolean} params.hasPermission
 * @param {(m: string) => boolean} params.canAccessModule
 * @param {{ summary?: { total?: number; byKind?: Record<string, number> }; items?: object[] } | null} [params.managementAttention]
 */
export function buildWorkspaceNotifications({
  snapshot,
  hasPermission,
  canAccessModule,
  officeSummary = null,
  hrNotifSummary = null,
  managementAttention = null,
}) {
  const items = [];
  const can = (p) => hasPermission('*') || hasPermission(p);
  const permissions = snapshot?.permissions ?? snapshot?.session?.permissions ?? [];
  const roleKey = snapshot?.session?.user?.roleKey;
  const userId = String(snapshot?.session?.user?.id || '').trim();
  const { count: lowStockSkuCount, examples: lowStockExamples } = countLowStockFromSnapshot(snapshot);
  const todayIso = new Date().toISOString().slice(0, 10);

  pushBranchManagerAlerts(items, { snapshot, roleKey, hasPermission, managementAttention });

  const canSalesDesk =
    roleKey !== 'cashier' && canAccessModule('sales') && (can('sales.view') || can('quotations.manage'));
  if (canSalesDesk && !userMaySeeManagementApprovalQueues(roleKey, permissions)) {
    const awaitingBm = (Array.isArray(snapshot?.quotations) ? snapshot.quotations : []).filter((q) =>
      quotationNeedsManagerClearance(q)
    );
    if (awaitingBm.length > 0) {
      const hints = formatNotificationPreview(awaitingBm.map((q) => formatPersonName(q.customer) || q.id));
      items.push({
        id: 'sales-awaiting-clearance',
        category: 'sales',
        title: 'Awaiting manager sign-off',
        detail: hints
          ? `${awaitingBm.length} paid quotation(s) waiting on branch manager clearance — ${hints}.`
          : `${awaitingBm.length} paid quotation(s) waiting on branch manager clearance.`,
        severity: 'info',
        priority: 48,
        path: '/sales',
        state: { focusSalesTab: 'quotations' },
      });
    }
  }

  if (canAccessModule('operations') && lowStockSkuCount > 0) {
    const preview = formatNotificationPreview(lowStockExamples);
    items.push({
      id: 'low-stock',
      category: 'operations',
      title: 'SKU below reorder level',
      detail: preview
        ? `${lowStockSkuCount} SKU(s) below minimum reorder level — e.g. ${preview}.`
        : `${lowStockSkuCount} SKU(s) below minimum reorder level.`,
      severity: 'warning',
      priority: 65,
      path: '/operations',
      state: { focusOpsTab: 'inventory' },
    });
  }

  const paymentRequests = Array.isArray(snapshot?.paymentRequests) ? snapshot.paymentRequests : [];
  const pendingPayApproval = paymentRequests.filter(
    (row) => String(row.approvalStatus || '').toLowerCase() === 'pending'
  );
  const pendingPayPayout = paymentRequests.filter((row) => {
    const requested = Number(row.amountRequestedNgn) || 0;
    const paid = Number(row.paidAmountNgn) || 0;
    if (String(row.approvalStatus || '').toLowerCase() === 'rejected') return false;
    if (String(row.approvalStatus || '').toLowerCase() !== 'approved') return false;
    return paid < requested;
  });

  if (canAccessModule('finance') && can('finance.approve') && pendingPayApproval.length > 0) {
    const onManager = items.some((n) => n.id === 'mgr-cash-out');
    if (!onManager) {
      items.push({
        id: 'payment-requests-approve',
        category: 'finance',
        title: 'Payment requests',
        detail: `${pendingPayApproval.length} expense request(s) awaiting approval.`,
        severity: 'warning',
        priority: 75,
        path: '/accounts',
        state: { accountsTab: 'requests' },
      });
    }
  }

  if (canAccessModule('finance') && (can('finance.pay') || can('cashier.desk.view')) && pendingPayPayout.length > 0) {
    items.push({
      id: 'payment-requests-payout',
      category: 'finance',
      title: 'Desk payouts',
      detail: `${pendingPayPayout.length} approved payment request(s) still need payout from My desk.`,
      severity: 'warning',
      priority: 76,
      path: '/accounts',
      state: { accountsTab: 'desk' },
    });
  }

  const refunds = Array.isArray(snapshot?.refunds) ? snapshot.refunds : [];
  const refundDue = approvedRefundsAwaitingPayment(refunds);
  if (canAccessModule('finance') && (can('finance.pay') || can('cashier.desk.view')) && refundDue.length > 0) {
    items.push({
      id: 'refund-payouts',
      category: 'finance',
      title: 'Refund payouts',
      detail: `${refundDue.length} approved refund(s) awaiting payout on My desk.`,
      severity: 'warning',
      priority: 77,
      path: '/accounts',
      state: { accountsTab: 'desk' },
    });
  }

  const registerWithdrawalsDue = Array.isArray(snapshot?.registerSettlementsAwaitingPayment)
    ? snapshot.registerSettlementsAwaitingPayment
    : [];
  if (
    canAccessModule('finance') &&
    (can('finance.pay') || can('cashier.desk.view')) &&
    registerWithdrawalsDue.length > 0
  ) {
    items.push({
      id: 'register-withdrawal-payouts',
      category: 'finance',
      title: 'Register withdrawals',
      detail: `${registerWithdrawalsDue.length} approved register withdrawal(s) awaiting payout on My desk.`,
      severity: 'warning',
      priority: 77,
      path: '/accounts',
      state: { accountsTab: 'desk' },
    });
  }

  const transportTreasuryDue = Array.isArray(snapshot?.poTransportAwaitingTreasury)
    ? snapshot.poTransportAwaitingTreasury
    : [];
  if (
    canAccessModule('finance') &&
    (can('finance.pay') || can('cashier.desk.view')) &&
    transportTreasuryDue.length > 0
  ) {
    items.push({
      id: 'po-transport-payouts',
      category: 'finance',
      title: 'PO transport payouts',
      detail: `${transportTreasuryDue.length} purchase order(s) with haulage still to pay from My desk.`,
      severity: 'warning',
      priority: 74,
      path: '/accounts',
      state: { accountsTab: 'desk' },
    });
  }

  if (
    canAccessModule('finance') &&
    (can('finance.approve') || can('finance.post') || can('reports.view'))
  ) {
    const catAlert = snapshot?.expenseCategoryMonthlyAlert;
    if (catAlert?.shouldAlert) {
      const parts = [];
      if (Number(catAlert.exceptionRowCount) > 0) {
        parts.push(`${catAlert.exceptionRowCount} exception request(s)`);
      }
      if (Number(catAlert.othersCount) > 0) {
        parts.push(`${catAlert.othersCount} Others`);
      }
      if (catAlert.ap3ShouldAlert && Number(catAlert.ap3UnclassifiedNgn) > 0) {
        parts.push(`AP3 unclassified ₦${Number(catAlert.ap3UnclassifiedNgn).toLocaleString('en-NG')}`);
      }
      items.push({
        id: 'expense-category-monthly',
        category: 'finance',
        title: 'Expense category review',
        detail:
          parts.join(' · ') ||
          `${catAlert.othersCount || 0} Others request(s) need Finance review this month.`,
        severity: Number(catAlert.othersCount) > 2 ? 'warning' : 'info',
        priority: 62,
        path: '/accounts',
        state: { accountsTab: 'disbursements' },
      });
    }
  }

  const transportLinkDue = Array.isArray(snapshot?.poTransportMissingLink)
    ? snapshot.poTransportMissingLink
    : [];
  if (
    canAccessModule('procurement') &&
    can('purchase_orders.manage') &&
    transportLinkDue.length > 0
  ) {
    items.push({
      id: 'po-transport-missing-link',
      category: 'procurement',
      title: 'POs need transport linked',
      detail: `${transportLinkDue.length} purchase order(s) missing haulier or quoted transport fee.`,
      severity: 'warning',
      priority: 72,
      path: '/procurement',
      state: { focusTab: 'transport' },
    });
  }

  const coilReq = Array.isArray(snapshot?.coilRequests) ? snapshot.coilRequests : [];
  const pendingCoils = coilReq.filter((r) => r.status === 'pending');
  if (canAccessModule('operations') && can('operations.manage') && pendingCoils.length > 0) {
    items.push({
      id: 'coil-requests',
      category: 'operations',
      title: 'Coil requests',
      detail: `${pendingCoils.length} store coil request(s) pending acknowledgement.`,
      severity: 'info',
      priority: 50,
      path: '/operations',
      state: { focusOpsTab: 'inventory' },
    });
  }

  const checks = Array.isArray(snapshot?.productionConversionChecks) ? snapshot.productionConversionChecks : [];
  const criticalCheck = checks.find(
    (row) => String(row.alertState || '').toLowerCase() === 'critical' && String(row.coilNo || '').trim()
  );
  if (canAccessModule('operations') && criticalCheck) {
    items.push({
      id: `coil-critical-${criticalCheck.id || criticalCheck.coilNo}`,
      category: 'operations',
      title: 'Critical coil conversion',
      detail: `${criticalCheck.coilNo} flagged as critical in production checks.`,
      severity: 'critical',
      priority: 92,
      path: `/operations/coils/${encodeURIComponent(criticalCheck.coilNo)}`,
    });
  }

  const opsAttn = snapshot?.operationsInventoryAttention;
  if (
    canAccessModule('operations') &&
    (can('operations.manage') || can('production.manage')) &&
    opsAttn?.ok
  ) {
    const stuckN = Number(opsAttn.stuckProductionAttentionDistinctJobCount) || 0;
    if (stuckN > 0) {
      items.push({
        id: 'ops-stuck-production',
        category: 'operations',
        title: 'Production follow-up',
        detail: `${stuckN} job(s) stuck or incomplete — missing coil, stale status, or spec mismatch.`,
        severity: 'warning',
        priority: 68,
        path: '/operations',
        state: { focusOpsTab: 'production' },
      });
    }
  }

  const quotes = Array.isArray(snapshot?.quotations) ? snapshot.quotations : [];
  const overdue = quotes.filter((q) => quotationIsOverdueForCollections(q, todayIso));
  if (canAccessModule('sales') && (can('sales.view') || can('quotations.manage')) && overdue.length > 0) {
    items.push({
      id: 'overdue-quotes',
      category: 'sales',
      title: 'Collections follow-up',
      detail: `${overdue.length} quotation(s) past due date — sales office should chase payment.`,
      severity: 'warning',
      priority: 60,
      path: '/sales',
      state: { focusSalesTab: 'quotations' },
    });
  }

  if (canAccessModule('office') && officeSummary) {
    const pending = Number(officeSummary.pendingActionApprox) || 0;
    const unread = Number(officeSummary.unreadApprox) || 0;
    if (pending > 0 || unread > 0) {
      const parts = [];
      if (pending > 0) parts.push(`${pending} thread(s) need your action`);
      if (unread > 0) parts.push(`${unread} unread update(s)`);
      items.push({
        id: 'office-desk',
        category: 'office',
        title: 'Office desk',
        detail: parts.join(' · ') || 'Internal memo updates.',
        severity: pending > 0 ? 'warning' : 'info',
        priority: pending > 0 ? 55 : 38,
        path: '/',
      });
    }
  }

  const workItems = Array.isArray(snapshot?.unifiedWorkItems) ? snapshot.unifiedWorkItems : [];
  const inboxCtx = { userId, roleKey, permissions };
  const coilShortReceiptOpen = workItems.filter(
    (item) =>
      String(item?.documentType || '').trim().toLowerCase() === 'coil_grn_short_receipt' &&
      String(item?.status || '').trim().toLowerCase() === 'open'
  );
  if (userMaySeeManagementApprovalQueues(roleKey, permissions) && coilShortReceiptOpen.length > 0) {
    items.push({
      id: 'coil-short-receipt-md',
      category: 'manager',
      title: 'Coil under-received vs PO',
      detail:
        coilShortReceiptOpen.length === 1
          ? coilShortReceiptOpen[0]?.summary || 'Store receipt below ordered kg — review with procurement.'
          : `${coilShortReceiptOpen.length} coil receipt(s) below ordered kg.`,
      severity: 'warning',
      priority: 85,
      path: '/operations',
      state: { focusOpsTab: 'inventory' },
    });
  }

  const actionableWorkItems = workItems.filter(
    (item) =>
      workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx) && workItemNeedsActionForUser(item, userId)
  );
  const personalOrOther = actionableWorkItems.filter((item) => {
    const dt = String(item?.documentType || '').trim().toLowerCase();
    if (workItemIsPersonalForUser(item, userId)) return true;
    return !MANAGER_QUEUE_DOC_TYPES.has(dt);
  });
  if (personalOrOther.length > 0) {
    const overdueCount = personalOrOther.filter((item) => item?.slaState === 'overdue').length;
    items.push({
      id: 'work-items-personal',
      category: 'registry',
      title: 'Assigned to you',
      detail:
        overdueCount > 0
          ? `${personalOrOther.length} item(s) on your desk · ${overdueCount} overdue.`
          : `${personalOrOther.length} item(s) assigned or routed to you.`,
      severity:
        overdueCount > 0 || personalOrOther.some((item) => String(item.priority || '').toLowerCase() === 'high')
          ? 'warning'
          : 'info',
      priority: overdueCount > 0 ? 58 : 42,
      path: '/',
    });
  }

  if (canAccessModule('hr') && hrNotifSummary?.items?.length) {
    for (const row of hrNotifSummary.items) {
      items.push({
        id: `hr-${row.key}`,
        category: 'hr',
        title: row.title,
        detail: `${row.count} item(s) need HR action.`,
        severity: row.key.includes('risk') || row.key.includes('absence') ? 'warning' : 'info',
        priority: row.key.includes('risk') ? 66 : 45,
        path: row.path,
      });
    }
  }

  return sortWorkspaceNotifications(items);
}
