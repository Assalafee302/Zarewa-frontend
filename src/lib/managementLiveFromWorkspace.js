/**
 * Derive manager-dashboard queues and headline metrics from the workspace bootstrap snapshot
 * so the Manager page updates as soon as Sales / Operations data refreshes (no stale API-only lists).
 */

import { DEFAULT_MANAGER_TARGETS_PER_MONTH } from './dashboardPrefs.js';
import { formatPersonName } from './formatPersonName.js';
import {
  cuttingListInProductionGate,
  quotationIsFlaggedForAudit,
  quotationNeedsManagerClearance,
} from './managementQueueFilters.js';
import { purchaseOrderIsPendingApproval, purchaseOrderLineTotalNgn } from './procurementStatus.js';
import { productionAttributedRevenueNgn, productionOutputDateISO } from './liveAnalytics.js';
import { isReceiptReversed, receiptEffectiveCashNgn } from './receiptClearance.js';

/** @typedef {'month' | '4months' | 'half' | 'year'} ManagerMetricPeriodKey */

export const MANAGER_METRIC_PERIODS = [
  { key: 'month', label: 'This month', shortLabel: 'Month', monthsSpan: 1 },
  { key: '4months', label: 'Last 4 months', shortLabel: '4 mo', monthsSpan: 4 },
  { key: 'half', label: 'Last 6 months', shortLabel: 'Half yr', monthsSpan: 6 },
  { key: 'year', label: 'Last 12 months', shortLabel: 'Year', monthsSpan: 12 },
];

export function managementMonthStartISO() {
  return managementPeriodStartISO('month');
}

/**
 * First calendar day (UTC) of the month that begins the rolling window: current month plus (span − 1) prior months.
 * `dateISO` values compare as YYYY-MM-DD strings.
 * @param {ManagerMetricPeriodKey} periodKey
 */
export function managementPeriodStartISO(periodKey) {
  const d = new Date();
  const subtractMonths =
    periodKey === '4months' ? 3 : periodKey === 'half' ? 5 : periodKey === 'year' ? 11 : 0;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  let ty = y;
  let tm = m - subtractMonths;
  while (tm < 0) {
    tm += 12;
    ty -= 1;
  }
  return `${ty}-${String(tm + 1).padStart(2, '0')}-01`;
}

/**
 * Mirrors server `listManagementItems` shapes for the SPA inbox (snake_case row fields).
 * @param {object} snapshot
 * @returns {{ pendingClearance: object[]; flagged: object[]; productionOverrides: object[]; pendingRefunds: object[]; pendingExpenses: object[]; pendingConversionReviews: object[]; pendingMaterialIncidents: object[] }}
 */
export function buildManagementQueuesFromSnapshot(snapshot) {
  const quotations = Array.isArray(snapshot?.quotations) ? snapshot.quotations : [];
  const cuttingLists = Array.isArray(snapshot?.cuttingLists) ? snapshot.cuttingLists : [];
  const refunds = Array.isArray(snapshot?.refunds) ? snapshot.refunds : [];
  const paymentRequests = Array.isArray(snapshot?.paymentRequests) ? snapshot.paymentRequests : [];
  const productionJobs = Array.isArray(snapshot?.productionJobs) ? snapshot.productionJobs : [];
  const materialIncidents = Array.isArray(snapshot?.materialIncidents) ? snapshot.materialIncidents : [];
  const purchaseOrders = Array.isArray(snapshot?.purchaseOrders) ? snapshot.purchaseOrders : [];

  const quoteById = new Map(quotations.map((q) => [q.id, q]));

  const pendingClearance = quotations
    .filter((q) => quotationNeedsManagerClearance(q))
    .map((q) => ({
      id: q.id,
      customer_name: formatPersonName(q.customer),
      total_ngn: Number(q.totalNgn) || 0,
      paid_ngn: Number(q.paidNgn) || 0,
      date_iso: q.dateISO,
      status: q.status,
      branch_id: q.branchId || '',
    }))
    .sort((a, b) => String(b.date_iso || '').localeCompare(String(a.date_iso || '')));

  const flagged = quotations
    .filter((q) => quotationIsFlaggedForAudit(q))
    .map((q) => ({
      id: q.id,
      customer_name: formatPersonName(q.customer),
      total_ngn: Number(q.totalNgn) || 0,
      manager_flag_reason: q.managerFlagReason || '',
      manager_flagged_at_iso: q.managerFlaggedAtISO,
      branch_id: q.branchId || '',
    }))
    .sort((a, b) =>
      String(b.manager_flagged_at_iso || '').localeCompare(String(a.manager_flagged_at_iso || ''))
    );

  const productionOverrides = cuttingLists
    .filter((cl) => cuttingListInProductionGate(cl, quoteById.get(cl.quotationRef)))
    .map((cl) => {
      const q = quoteById.get(cl.quotationRef);
      return {
        id: cl.id,
        customer_name: formatPersonName(cl.customer || q.customer),
        quotation_ref: cl.quotationRef,
        total_meters: cl.totalMeters,
        paid_ngn: Number(q.paidNgn) || 0,
        total_ngn: Number(q.totalNgn) || 0,
        branch_id: cl.branchId || q.branchId || '',
      };
    });

  const pendingRefunds = refunds
    .filter((r) => String(r.status) === 'Pending')
    .map((r) => ({
      refund_id: r.refundID,
      customer_name: formatPersonName(r.customer),
      quotation_ref: r.quotationRef,
      amount_ngn: r.amountNgn,
      requested_at_iso: r.requestedAtISO,
      reason_category: r.reasonCategory,
      branch_id: r.branchId || '',
    }));

  const pendingExpenses = paymentRequests
    .filter((pr) => String(pr.approvalStatus || '').toLowerCase() === 'pending')
    .map((pr) => ({
      request_id: pr.requestID,
      expense_id: pr.expenseID,
      amount_requested_ngn: pr.amountRequestedNgn,
      request_date: pr.requestDate,
      description: pr.description,
      approval_status: pr.approvalStatus,
      request_reference: pr.requestReference ?? '',
      line_items: Array.isArray(pr.lineItems) ? pr.lineItems : [],
      attachment_present: Boolean(pr.attachmentPresent),
      attachment_name: pr.attachmentName ?? '',
      expense_category: pr.expenseCategory ?? '',
      expense_category_lane: pr.expenseCategoryLane ?? '',
      branch_id: pr.branchId || '',
    }));

  const pendingConversionReviews = productionJobs
    .filter(
      (j) =>
        String(j.status) === 'Completed' &&
        !String(j.managerReviewSignedAtISO || '').trim() &&
        (Boolean(j.managerReviewRequired) ||
          j.conversionAlertState === 'High' ||
          j.conversionAlertState === 'Low')
    )
    .map((j) => ({
      job_id: j.jobID,
      cutting_list_id: j.cuttingListId,
      quotation_ref: j.quotationRef,
      customer_name: formatPersonName(j.customerName),
      product_name: j.productName,
      conversion_alert_state: j.conversionAlertState,
      manager_review_required: j.managerReviewRequired ? 1 : 0,
      actual_meters: j.actualMeters,
      actual_weight_kg: j.actualWeightKg,
      completed_at_iso: j.completedAtISO,
      branch_id: j.branchId || '',
    }))
    .sort((a, b) =>
      String(b.completed_at_iso || '').localeCompare(String(a.completed_at_iso || ''))
    );

  const pendingMaterialIncidents = materialIncidents
    .filter((m) => String(m.status || '').toLowerCase() === 'submitted')
    .map((m) => ({
      id: m.id,
      incident_type: m.incidentType ?? m.incident_type ?? '',
      gauge_label: m.gaugeLabel ?? m.gauge_label ?? '',
      colour: m.colour ?? '',
      total_meters: Number(m.totalMeters ?? m.total_meters) || 0,
      date_iso: m.dateISO ?? m.date_iso ?? '',
      storekeeper_remark: m.storekeeperRemark ?? m.storekeeper_remark ?? '',
      branch_id: m.branchId ?? m.branch_id ?? '',
    }))
    .sort((a, b) => String(b.date_iso || '').localeCompare(String(a.date_iso || '')));

  const pendingPurchaseOrders = purchaseOrders
    .filter((po) => purchaseOrderIsPendingApproval(po))
    .map((po) => ({
      po_id: po.poID,
      supplier_name: po.supplierName || '',
      order_date_iso: po.orderDateISO || '',
      status: po.status,
      total_ngn: purchaseOrderLineTotalNgn(po),
      branch_id: po.branchId || '',
      line_count: Array.isArray(po.lines) ? po.lines.length : 0,
    }))
    .sort((a, b) => String(b.order_date_iso || '').localeCompare(String(a.order_date_iso || '')));

  return {
    pendingClearance,
    flagged,
    productionOverrides,
    pendingRefunds,
    pendingExpenses,
    pendingConversionReviews,
    pendingMaterialIncidents,
    pendingPurchaseOrders,
  };
}

function refundImpactNgn(refund) {
  const status = String(refund?.status || '').toLowerCase();
  if (status === 'paid') return Math.round(Number(refund?.paidAmountNgn) || 0);
  if (status === 'approved') {
    return Math.round(Number(refund?.approvedAmountNgn) || Number(refund?.amountNgn) || 0);
  }
  return 0;
}

/**
 * Rank customers by net cash collected (receipts minus approved/paid refunds) in the period,
 * with cutting-list metres attached for display.
 *
 * @param {object[]} receipts
 * @param {object[]} refunds
 * @param {object[]} cuttingLists
 * @param {Map<string, object>} quoteById
 * @param {string} periodStartISO
 * @param {number} [limit]
 */
export function topCustomersByNetPaymentsAndMeters(
  receipts,
  refunds,
  cuttingLists,
  quoteById,
  periodStartISO,
  limit = 5
) {
  /** @type {Map<string, { customer_id: string; customer_name: string; paymentsNgn: number; refundsNgn: number; cuttingListMeters: number }>} */
  const byCustomer = new Map();

  const touch = (cid, name) => {
    const key = String(cid || '').trim();
    if (!key) return null;
    if (!byCustomer.has(key)) {
      byCustomer.set(key, {
        customer_id: key,
        customer_name: formatPersonName(name || key),
        paymentsNgn: 0,
        refundsNgn: 0,
        cuttingListMeters: 0,
      });
    }
    return byCustomer.get(key);
  };

  for (const r of receipts) {
    if (isReceiptReversed(r)) continue;
    const d = String(r.dateISO || r.date || '').slice(0, 10);
    if (!d || d < periodStartISO) continue;
    const pay = receiptEffectiveCashNgn(r);
    if (pay <= 0) continue;
    const cid = String(r.customerID || '').trim();
    if (!cid) continue;
    const row = touch(cid, r.customer);
    if (!row) continue;
    row.paymentsNgn += pay;
  }

  for (const rf of refunds) {
    const d = String(rf.requestedAtISO || rf.paidAtISO || '').slice(0, 10);
    if (!d || d < periodStartISO) continue;
    const amt = refundImpactNgn(rf);
    if (amt <= 0) continue;
    const cid = String(rf.customerID || '').trim();
    if (!cid) continue;
    const row = touch(cid, rf.customer);
    if (!row) continue;
    row.refundsNgn += amt;
  }

  for (const cl of cuttingLists) {
    const d = String(cl.dateISO || '').slice(0, 10);
    if (!d || d < periodStartISO) continue;
    const q = quoteById.get(cl.quotationRef);
    const cid = String(cl.customerID || q?.customerID || '').trim();
    if (!cid) continue;
    const row = touch(cid, cl.customer || q?.customer);
    if (!row) continue;
    row.cuttingListMeters += Number(cl.totalMeters) || 0;
  }

  return [...byCustomer.values()]
    .map((row) => ({
      ...row,
      paymentsNgn: Math.round(row.paymentsNgn),
      refundsNgn: Math.round(row.refundsNgn),
      netCollectedNgn: Math.round(row.paymentsNgn - row.refundsNgn),
      cuttingListMeters: Math.round(row.cuttingListMeters),
    }))
    .filter((row) => row.netCollectedNgn > 0 || row.cuttingListMeters > 0)
    .sort(
      (a, b) =>
        b.netCollectedNgn - a.netCollectedNgn ||
        b.cuttingListMeters - a.cuttingListMeters ||
        b.paymentsNgn - a.paymentsNgn
    )
    .slice(0, limit);
}

/**
 * Headline metrics for the hero + top customers (month-scoped) from workspace quotation / cutting-list rows.
 * Produced-sales and completed metres match {@link DashboardKpiStrip} when the same period start is used.
 *
 * @param {object[]} quotations
 * @param {object[]} cuttingLists
 * @param {object[]} productionJobs
 * @param {number} lowStockSkuCount — from live inventory context
 * @param {{ nairaTarget?: number; meterTarget?: number }} targets — per **month** (multiplied by selected period span)
 * @param {ManagerMetricPeriodKey} [periodKey]
 * @param {object[]} [receipts]
 * @param {object[]} [refunds]
 */
export function buildManagerSnapshotsFromWorkspace(
  quotations,
  cuttingLists,
  productionJobs,
  lowStockSkuCount,
  targets,
  periodKey = 'month',
  receipts = [],
  refunds = []
) {
  const ms = managementPeriodStartISO(periodKey);
  const qMonth = quotations.filter((q) => String(q.dateISO || '') >= ms);
  const paidOnQuotesNgn = qMonth.reduce((s, q) => s + (Number(q.paidNgn) || 0), 0);
  const quoteCount = qMonth.length;
  const metersCuttingLists = cuttingLists
    .filter((cl) => String(cl.dateISO || '') >= ms)
    .reduce((s, cl) => s + (Number(cl.totalMeters) || 0), 0);

  const jobs = Array.isArray(productionJobs) ? productionJobs : [];
  const producedSalesNgn = productionAttributedRevenueNgn(quotations, jobs, ms, '');
  const completedProductionMetres = jobs.reduce((s, j) => {
    if (String(j.status || '').trim() !== 'Completed') return s;
    const d = productionOutputDateISO(j);
    if (!d || d < ms) return s;
    return s + (Number(j.actualMeters) || 0);
  }, 0);

  const quoteById = new Map(quotations.map((q) => [q.id, q]));
  const topCustomers = topCustomersByNetPaymentsAndMeters(
    receipts,
    refunds,
    cuttingLists,
    quoteById,
    ms,
    5
  );

  const meta = MANAGER_METRIC_PERIODS.find((p) => p.key === periodKey);
  const monthsSpan = meta?.monthsSpan ?? 1;
  const baseNaira = Number(targets?.nairaTarget) || DEFAULT_MANAGER_TARGETS_PER_MONTH.nairaTargetPerMonth;
  const baseMeters = Number(targets?.meterTarget) || DEFAULT_MANAGER_TARGETS_PER_MONTH.meterTargetPerMonth;

  return {
    paidOnQuotesNgn,
    producedSalesNgn,
    quoteCount,
    lowStockCount: lowStockSkuCount,
    metersCuttingLists,
    completedProductionMetres,
    topCustomers,
    periodKey,
    periodLabel: meta?.label ?? 'This month',
    targets: {
      nairaTarget: baseNaira * monthsSpan,
      meterTarget: baseMeters * monthsSpan,
    },
  };
}
