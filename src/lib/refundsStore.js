/**
 * Refund requests — shared between Sales (create / approve) and Finance (pay out).
 * Live data comes from workspace snapshot; localStorage is legacy-only if present.
 */

import { formatPersonName } from './formatPersonName.js';
import { effectiveOutstandingNgn } from './paymentOutstandingTolerance.js';
import { refundQuotationRefundsBlocked } from './refundEligibility.js';

const STORAGE_KEY = 'zarewa.sales.refunds';

/** @typedef {'Pending'|'Approved'|'Rejected'|'Cancelled'|'Paid'} RefundStatus */

function normalizeLine(line) {
  return {
    label: String(line?.label ?? '').trim(),
    amountNgn: Number(line?.amountNgn) || 0,
    category: String(line?.category ?? '').trim(),
  };
}

function normalizePayoutLine(line) {
  return {
    id: String(line?.id ?? ''),
    postedAtISO: String(line?.postedAtISO ?? ''),
    treasuryAccountId: line?.treasuryAccountId ?? '',
    accountName: String(line?.accountName ?? ''),
    amountNgn: Number(line?.amountNgn) || 0,
    reference: String(line?.reference ?? ''),
    note: String(line?.note ?? ''),
  };
}

export function refundApprovedAmount(r) {
  const requested = Number(r?.amountNgn) || 0;
  const approved = Number(r?.approvedAmountNgn);
  if (Number.isFinite(approved) && approved > 0) return approved;
  if (r?.status === 'Approved' || r?.status === 'Paid') return requested;
  return 0;
}

export function refundOutstandingAmount(r) {
  const approved = refundApprovedAmount(r);
  const paid = Number(r?.paidAmountNgn) || 0;
  return effectiveOutstandingNgn(approved, paid);
}

/**
 * Phase 11A — cashiers pay approved refunds only; managers/MD/finance approve.
 * @param {{ hasPermission?: (p: string) => boolean; roleKey?: string } | null | undefined} ws
 */
export function userMayApproveRefundRequests(ws) {
  if (!ws) return false;
  const rk = String(ws.session?.user?.roleKey ?? ws.roleKey ?? '').trim().toLowerCase();
  if (rk === 'cashier') return false;
  const can = typeof ws.hasPermission === 'function' ? ws.hasPermission.bind(ws) : () => false;
  return can('*') || can('refunds.approve') || can('finance.approve');
}

/** Rejected finance decision or cancel-before-pay — does not reserve quotation headroom or block a new request. */
export function refundStatusIsWithdrawn(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'rejected' || s === 'cancelled';
}

/**
 * @param {object} r
 * @returns {object}
 */
export function normalizeRefund(r) {
  if (!r || typeof r !== 'object') {
    return {
      refundID: '',
      customerID: '',
      customer: '—',
      quotationRef: '',
      cuttingListRef: '',
      product: '—',
      reasonCategory: '',
      reason: '—',
      amountNgn: 0,
      calculationLines: [],
      suggestedLines: [],
      previewSnapshot: null,
      calculationNotes: '',
      status: 'Pending',
      requestedBy: '—',
      requestedAtISO: '',
      approvalDate: '',
      approvedBy: '',
      approvedAmountNgn: 0,
      managerComments: '',
      paidAmountNgn: 0,
      paidAtISO: '',
      paidBy: '',
      paymentNote: '',
      payeeName: '',
      payeeAccountNo: '',
      payoutLines: [],
    };
  }
  const amountNgn = Number(r.amountNgn) || 0;
  const paidAmountNgn = Number(r.paidAmountNgn) || 0;
  const approvedAmountNgn = refundApprovedAmount({ ...r, amountNgn, paidAmountNgn });
  return {
    refundID: r.refundID,
    customerID: r.customerID ?? '',
    customer: formatPersonName(r.customer ?? ''),
    quotationRef: r.quotationRef ?? '',
    cuttingListRef: r.cuttingListRef ?? '',
    product: r.product ?? '—',
    reasonCategory: r.reasonCategory ?? '',
    reason: r.reason ?? '—',
    amountNgn,
    calculationLines: Array.isArray(r.calculationLines) ? r.calculationLines.map(normalizeLine) : [],
    suggestedLines: Array.isArray(r.suggestedLines) ? r.suggestedLines.map(normalizeLine) : [],
    previewSnapshot:
      r.previewSnapshot != null && typeof r.previewSnapshot === 'object' ? r.previewSnapshot : null,
    calculationNotes: r.calculationNotes ?? '',
    status:
      r.status === 'Paid' || r.status === 'Rejected' || r.status === 'Approved' || r.status === 'Cancelled'
        ? r.status
        : 'Pending',
    requestedBy: formatPersonName(r.requestedBy ?? '—'),
    requestedAtISO: r.requestedAtISO ?? '',
    approvalDate: r.approvalDate ?? '',
    approvedBy: formatPersonName(r.approvedBy ?? ''),
    approvedAmountNgn,
    managerComments: r.managerComments ?? '',
    paidAmountNgn,
    paidAtISO: r.paidAtISO ?? '',
    paidBy: formatPersonName(r.paidBy ?? ''),
    paymentNote: r.paymentNote ?? '',
    payeeName: formatPersonName(String(r.payeeName ?? r.payee_name ?? '').trim()),
    payeeAccountNo: String(r.payeeAccountNo ?? r.payee_account_no ?? '').trim(),
    payeeBankName: String(r.payeeBankName ?? r.payee_bank_name ?? '').trim(),
    payoutHistory: Array.isArray(r.payoutHistory) ? r.payoutHistory.map(normalizePayoutLine) : [],
    outstandingAmountNgn: effectiveOutstandingNgn(approvedAmountNgn, paidAmountNgn),
    quotationRefundsBlockedAtISO:
      r.quotationRefundsBlockedAtISO ?? r.quotation_refunds_blocked_at_iso ?? null,
    quotationRefundsBlockedReason:
      r.quotationRefundsBlockedReason ?? r.quotation_refunds_blocked_reason ?? '',
  };
}

export function isRefundPayable(r) {
  return (
    r?.status === 'Approved' &&
    refundOutstandingAmount(r) > 0 &&
    !refundQuotationRefundsBlocked(r)
  );
}

/**
 * Open refund still in flight for the customer — Pending approval, or Approved with unpaid balance.
 * Display-only signal for finance confirmation / reconciliation (no auto-apply).
 */
export function isRefundHanging(r) {
  if (!r || refundStatusIsWithdrawn(r.status) || r.status === 'Paid') return false;
  if (r.status === 'Pending') return true;
  return isRefundPayable(r);
}

/** Amount still open on a hanging refund (requested for Pending; unpaid approved for payable). */
export function hangingRefundOpenAmountNgn(r) {
  if (!isRefundHanging(r)) return 0;
  if (r.status === 'Pending') return Math.round(Number(r.amountNgn) || 0);
  return refundOutstandingAmount(r);
}

/**
 * @param {object[] | null | undefined} list
 * @param {string | null | undefined} customerId
 */
export function hangingRefundsForCustomer(list, customerId) {
  const id = String(customerId || '').trim();
  if (!id) return [];
  return (list ?? []).filter((r) => String(r?.customerID || '').trim() === id && isRefundHanging(r));
}

/**
 * @param {object[]} hanging
 * @returns {{ count: number; totalOpenNgn: number; shortLabel: string; detailLabel: string } | null}
 */
export function hangingRefundIndicator(hanging) {
  const rows = Array.isArray(hanging) ? hanging.filter(isRefundHanging) : [];
  if (rows.length === 0) return null;
  const totalOpenNgn = rows.reduce((sum, r) => sum + hangingRefundOpenAmountNgn(r), 0);
  const count = rows.length;
  const shortLabel =
    count === 1 ? 'Hanging refund' : `${count} hanging refunds`;
  const parts = rows.map((r) => {
    const rid = String(r.refundID || '').trim() || '—';
    const status = String(r.status || '').trim() || '—';
    const q = String(r.quotationRef || '').trim();
    return q ? `${rid} ${status} (${q})` : `${rid} ${status}`;
  });
  const detailLabel = parts.join('; ');
  return { count, totalOpenNgn, shortLabel, detailLabel };
}

/**
 * @param {object[] | null | undefined} list
 * @returns {Map<string, ReturnType<typeof hangingRefundIndicator> & { refunds: object[] }>}
 */
export function hangingRefundIndicatorsByCustomerId(list) {
  /** @type {Map<string, object[]>} */
  const grouped = new Map();
  for (const r of list ?? []) {
    if (!isRefundHanging(r)) continue;
    const id = String(r?.customerID || '').trim();
    if (!id) continue;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(r);
  }
  /** @type {Map<string, ReturnType<typeof hangingRefundIndicator> & { refunds: object[] }>} */
  const out = new Map();
  for (const [id, refunds] of grouped) {
    const indicator = hangingRefundIndicator(refunds);
    if (indicator) out.set(id, { ...indicator, refunds });
  }
  return out;
}

export function loadRefunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeRefund);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveRefunds(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map(normalizeRefund)));
  } catch {
    /* ignore */
  }
}

export function approvedRefundsAwaitingPayment(list) {
  return (list ?? []).filter(isRefundPayable);
}
