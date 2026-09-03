/**
 * Refund requests — shared between Sales (create / approve) and Finance (pay out).
 * Live data comes from workspace snapshot; localStorage is legacy-only if present.
 */

import { formatPersonName } from './formatPersonName.js';
import { effectiveOutstandingNgn } from './paymentOutstandingTolerance.js';
import { refundQuotationRefundsBlocked } from './refundEligibility.js';
import { overpayCreditNgnByCustomerIdFromEntries } from './customerLedgerCore.js';

const STORAGE_KEY = 'zarewa.sales.refunds';

/** @typedef {'Pending'|'Approved'|'Partially paid'|'Rejected'|'Cancelled'|'Paid'} RefundStatus */

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
  if (r?.status === 'Approved' || r?.status === 'Paid' || r?.status === 'Partially paid') return requested;
  return 0;
}

/** Requested cash still waiting on the manager after refund fund was used on a receipt. */
export function refundLeftoverAwaitingApprovalNgn(r) {
  const requested = Math.round(Number(r?.amountNgn ?? r?.amount_ngn) || 0);
  const applied = Math.round(Number(r?.creditAppliedNgn ?? r?.credit_applied_ngn) || 0);
  return Math.max(0, requested - applied);
}

/** Default Approved ₦: leftover cash after fund use, else requested / already approved. */
export function refundDefaultApproveAmountNgn(r) {
  const requested = Math.round(Number(r?.amountNgn ?? r?.amount_ngn) || 0);
  const applied = Math.round(Number(r?.creditAppliedNgn ?? r?.credit_applied_ngn) || 0);
  if (applied > 0) return Math.max(0, requested - applied);
  return refundApprovedAmount(r) || requested;
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

/**
 * MD/CEO/chairman keep finance.pay for other desks but must not pay customer refunds.
 * Admin trial still allowed. API remains the real gate.
 */
export function userMayPayCustomerRefund(ws) {
  if (!ws) return false;
  const rk = String(ws.session?.user?.roleKey ?? ws.roleKey ?? '').trim().toLowerCase();
  const can = typeof ws.hasPermission === 'function' ? ws.hasPermission.bind(ws) : () => false;
  if (rk === 'admin' || can('*')) return true;
  if (rk === 'md' || rk === 'ceo' || rk === 'chairman') return false;
  return true;
}

export const MD_REFUND_PAY_BLOCKED_MESSAGE =
  'Managing Director cannot pay customer refunds. Cashier or Head of Accounts must execute the payout.';

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
      r.status === 'Paid' ||
      r.status === 'Rejected' ||
      r.status === 'Approved' ||
      r.status === 'Cancelled' ||
      r.status === 'Partially paid'
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
    // Create/submit allocation — must survive Sales persist → POST /api/refunds.
    refundSplits: Array.isArray(r.refundSplits)
      ? r.refundSplits
      : Array.isArray(r.splitDistributions)
        ? r.splitDistributions
        : [],
    splitDistributions: Array.isArray(r.splitDistributions)
      ? r.splitDistributions
      : Array.isArray(r.refundSplits)
        ? r.refundSplits
        : [],
    productionAlignmentAcknowledgedCodes: Array.isArray(r.productionAlignmentAcknowledgedCodes)
      ? r.productionAlignmentAcknowledgedCodes
      : [],
    productionAlignmentOverrideNote: String(r.productionAlignmentOverrideNote ?? '').trim(),
    payoutHistory: Array.isArray(r.payoutHistory) ? r.payoutHistory.map(normalizePayoutLine) : [],
    outstandingAmountNgn: effectiveOutstandingNgn(approvedAmountNgn, paidAmountNgn),
    creditAppliedNgn: Math.round(Number(r.creditAppliedNgn ?? r.credit_applied_ngn) || 0),
    creditAppliedToQuotationRef: String(
      r.creditAppliedToQuotationRef ?? r.credit_applied_to_quotation_ref ?? ''
    ).trim(),
    creditConfirmationStatus: String(
      r.creditConfirmationStatus ?? r.credit_confirmation_status ?? ''
    ).trim(),
    quotationRefundsBlockedAtISO:
      r.quotationRefundsBlockedAtISO ?? r.quotation_refunds_blocked_at_iso ?? null,
    quotationRefundsBlockedReason:
      r.quotationRefundsBlockedReason ?? r.quotation_refunds_blocked_reason ?? '',
    walletOpenNgn: Math.round(Number(r.walletOpenNgn ?? r.wallet_open_ngn) || 0),
    heldNetNgn: Math.round(Number(r.heldNetNgn ?? r.held_net_ngn) || 0),
  };
}

export function isRefundPayable(r) {
  if (Math.round(Number(r?.walletOpenNgn) || 0) > 0) return false;
  return (
    (r?.status === 'Approved' || r?.status === 'Partially paid') &&
    refundOutstandingAmount(r) > 0 &&
    !refundQuotationRefundsBlocked(r)
  );
}

/**
 * Paid/Approved with a full paid_amount but no payout actor or date — approval settlement
 * (or a false Paid), not till cash. Keep it visible on hanging / finance desks.
 */
export function refundLooksPaidWithoutTillPayout(r) {
  if (!r || refundStatusIsWithdrawn(r.status)) return false;
  const status = String(r.status || '').trim();
  if (!['Paid', 'Approved', 'Partially paid'].includes(status)) return false;
  const paidAt = String(r.paidAtISO ?? r.paid_at_iso ?? '').trim();
  const paidBy = String(r.paidBy ?? r.paid_by ?? '').trim();
  if (paidAt || paidBy) return false;
  const approved = refundApprovedAmount(r);
  const requested = Math.round(Number(r.amountNgn) || 0);
  const paid = Math.round(Number(r.paidAmountNgn) || 0);
  const cap = approved > 0 ? approved : requested;
  return cap > 0 && paid >= cap;
}

/** Wallet still open or false Paid (cut/credit) with no till actor/date. */
export function refundPayeeStillUnsettled(r) {
  if (!r || refundStatusIsWithdrawn(r.status)) return false;
  if (Math.round(Number(r.walletOpenNgn) || 0) > 0) return true;
  return refundLooksPaidWithoutTillPayout(r);
}

/**
 * Display label for status chips. Never returns "Paid" while the payee is unsettled.
 * DB status is unchanged — reports still use Paid internally.
 */
export function refundPublicStatusLabel(r) {
  const stored = String(r?.status || '').trim() || 'Pending';
  if (!refundPayeeStillUnsettled(r)) return stored;
  if (Math.round(Number(r.walletOpenNgn) || 0) > 0) return 'Payee not settled';
  return 'Awaiting till payout';
}

/**
 * Open refund still in flight — Pending, unpaid Approved, open wallet, or false Paid with no till payout.
 * Display-only; never hide these from cashier confirm.
 */
export function isRefundHanging(r) {
  if (!r || refundStatusIsWithdrawn(r.status)) return false;
  if (Math.round(Number(r.walletOpenNgn) || 0) > 0) return true;
  if (refundLooksPaidWithoutTillPayout(r)) return true;
  if (r.status === 'Paid') return false;
  if (r.status === 'Pending') return true;
  return isRefundPayable(r);
}

/** Payable till rows plus false-Paid / fully settled-without-payout rows Finance must still see.
 * Wallet-credited refunds stay off the cashier till queue unless a payee net is held
 * for unconfirmed receipts (admin may till-pay that slice).
 */
export function refundsOnFinanceRefundQueue(list) {
  return (list ?? []).filter((r) => {
    if (isRefundPayable(r) || refundLooksPaidWithoutTillPayout(r)) return true;
    const status = String(r?.status || '').trim();
    if (status !== 'Approved' && status !== 'Partially paid') return false;
    if (refundQuotationRefundsBlocked(r)) return false;
    const splits = Array.isArray(r?.splitDistributions)
      ? r.splitDistributions
      : Array.isArray(r?.refundSplits)
        ? r.refundSplits
        : [];
    if (
      splits.some(
        (s) =>
          Boolean(s?.payoutHeldForUnclearedReceipts) ||
          Math.round(Number(s?.unclearedReceiptHoldNgn ?? s?.uncleared_receipt_hold_ngn) || 0) > 0
      )
    ) {
      return true;
    }
    return Math.round(Number(r?.heldNetNgn) || 0) > 0;
  });
}

/** Amount still open on a hanging refund (requested for Pending; unpaid approved for payable). */
export function hangingRefundOpenAmountNgn(r) {
  if (!isRefundHanging(r)) return 0;
  if (r.status === 'Pending') {
    const requested = Math.round(Number(r.amountNgn) || 0);
    const paid = Math.round(Number(r.paidAmountNgn) || 0);
    const creditApplied = Math.round(Number(r.creditAppliedNgn) || 0);
    return Math.max(0, requested - paid - creditApplied);
  }
  return refundOutstandingAmount(r);
}

/** True when refund was settled (fully or partly) by credit apply onto another quotation. */
export function refundHasCreditConfirmation(r) {
  return Boolean(String(r?.creditConfirmationStatus || '').trim()) || Math.round(Number(r?.creditAppliedNgn) || 0) > 0;
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
 * Note: `overpayCreditNgn` is the customer's ledger credit not yet applied or refunded. It is shown
 * separately from `totalOpenNgn` (never summed) because a Pending/Approved overpayment refund keeps
 * the credit on the ledger until payout — adding them would double-count.
 * @param {object[]} hanging
 * @param {number} [overpayCreditNgn] unapplied overpayment credit on the customer's ledger (₦)
 * @returns {{ count: number; totalOpenNgn: number; overpayCreditNgn: number; shortLabel: string; detailLabel: string } | null}
 */
export function hangingRefundIndicator(hanging, overpayCreditNgn = 0) {
  const rows = Array.isArray(hanging) ? hanging.filter(isRefundHanging) : [];
  const creditNgn = Math.max(0, Math.round(Number(overpayCreditNgn) || 0));
  if (rows.length === 0 && creditNgn <= 0) return null;
  const totalOpenNgn = rows.reduce((sum, r) => sum + hangingRefundOpenAmountNgn(r), 0);
  const count = rows.length;
  const shortLabel =
    count === 0
      ? 'Unapplied overpay credit'
      : count === 1
        ? 'Hanging refund'
        : `${count} hanging refunds`;
  const parts = rows.map((r) => {
    const rid = String(r.refundID || '').trim() || '—';
    const status = String(r.status || '').trim() || '—';
    const q = String(r.quotationRef || '').trim();
    return q ? `${rid} ${status} (${q})` : `${rid} ${status}`;
  });
  if (creditNgn > 0) {
    parts.push(`Unapplied overpay credit on ledger (no refund requested / not applied yet)`);
  }
  const detailLabel = parts.join('; ');
  return { count, totalOpenNgn, overpayCreditNgn: creditNgn, shortLabel, detailLabel };
}

/**
 * @param {object[] | null | undefined} list refunds
 * @param {object[] | null | undefined} [ledgerEntries] customer ledger entries — adds customers whose
 *   overpayment credit has not been applied or requested as a refund yet
 * @returns {Map<string, ReturnType<typeof hangingRefundIndicator> & { refunds: object[] }>}
 */
export function hangingRefundIndicatorsByCustomerId(list, ledgerEntries) {
  /** @type {Map<string, object[]>} */
  const grouped = new Map();
  for (const r of list ?? []) {
    if (!isRefundHanging(r)) continue;
    const id = String(r?.customerID || '').trim();
    if (!id) continue;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(r);
  }
  const creditById = overpayCreditNgnByCustomerIdFromEntries(ledgerEntries);
  /** @type {Map<string, ReturnType<typeof hangingRefundIndicator> & { refunds: object[] }>} */
  const out = new Map();
  const customerIds = new Set([...grouped.keys(), ...creditById.keys()]);
  for (const id of customerIds) {
    const refunds = grouped.get(id) || [];
    const indicator = hangingRefundIndicator(refunds, creditById.get(id) || 0);
    if (indicator) out.set(id, { ...indicator, refunds });
  }
  return out;
}

export function loadRefunds() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveRefunds(_list) {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function approvedRefundsAwaitingPayment(list) {
  return (list ?? []).filter(isRefundPayable);
}
