import { normalizeExpensePayeeKey } from './expenseRequestFormCore.js';
import { paymentRequestOutstandingNgn } from './financeTreasuryPayoutQueueMeta.js';

function closedPaymentStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'rejected' || s === 'cancelled' || s === 'canceled';
}

function requestIdOf(req) {
  return String(req?.requestID || req?.request_id || req?.id || '').trim();
}

function expenseIdOf(req) {
  return String(req?.expenseID || req?.expense_id || '').trim();
}

function requestedAmountOf(req) {
  return Math.round(Number(req?.amountRequestedNgn ?? req?.amount_requested_ngn ?? req?.amountNgn) || 0);
}

function payeeAccountKey(req) {
  return String(req?.payeeAccountNo || req?.payee_account_no || '').replace(/\s+/g, '');
}

function workOrderKey(req) {
  const wo = String(req?.maintenanceWorkOrderId || req?.maintenance_work_order_id || '').trim();
  if (wo) return wo.toLowerCase();
  const ref = String(req?.requestReference || req?.request_reference || '').trim();
  if (/^mwo/i.test(ref)) return ref.toLowerCase();
  return '';
}

function memoKey(req) {
  return String(req?.description || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Cashier money split for an expense payment request.
 */
export function expenseCashierMoneyStory(req) {
  const requestedNgn = requestedAmountOf(req);
  const paidNgn = Math.round(Number(req?.paidAmountNgn ?? req?.paid_amount_ngn) || 0);
  const dueNgn = paymentRequestOutstandingNgn(req);
  return { requestedNgn, paidNgn, dueNgn };
}

/**
 * Posted expense card with no payment-request row — still inspectable on Paid.
 */
export function postedExpenseToCashierRequest(ex) {
  if (!ex || typeof ex !== 'object') return null;
  const expenseID = expenseIdOf(ex);
  if (!expenseID) return null;
  const amount = Math.round(Number(ex.amountNgn ?? ex.amount_ngn) || 0);
  return {
    requestID: '',
    expenseID,
    description: String(ex.expenseType || ex.category || 'Posted expense').trim() || 'Posted expense',
    amountRequestedNgn: amount,
    paidAmountNgn: amount,
    approvalStatus: 'Paid',
    requestDate: String(ex.date || ex.dateISO || '').slice(0, 10),
    expenseCategory: String(ex.category || '').trim(),
    requestReference: String(ex.reference || '').trim(),
    payeeName: String(ex.payeeName || ex.payee_name || '').trim(),
    lineItems: [],
    attachmentPresent: false,
    postedExpenseOnly: true,
    branchId: String(ex.branchId || ex.branch_id || '').trim(),
  };
}

/**
 * Resolve a cashier detail target from a request id and/or posted expense id.
 */
export function resolveExpenseCashierTarget({
  requestId = '',
  expenseId = '',
  paymentRequests = [],
  expenses = [],
} = {}) {
  const rid = String(requestId || '').trim();
  const eid = String(expenseId || '').trim();
  const requests = Array.isArray(paymentRequests) ? paymentRequests : [];
  if (rid) {
    const hit = requests.find((pr) => requestIdOf(pr) === rid);
    if (hit) return hit;
  }
  if (eid) {
    const byExpense = requests.find((pr) => expenseIdOf(pr) === eid);
    if (byExpense) return byExpense;
    const ex = (Array.isArray(expenses) ? expenses : []).find((row) => expenseIdOf(row) === eid);
    if (ex) return postedExpenseToCashierRequest(ex);
  }
  return null;
}

/**
 * Why another request looks like a repeat of the open one. Null = not similar.
 */
export function similarPaymentRequestReason(current, other) {
  if (!current || !other) return null;
  if (closedPaymentStatus(other.approvalStatus || other.status)) return null;
  if (closedPaymentStatus(current.approvalStatus || current.status)) return null;

  const reasons = [];
  const amtA = requestedAmountOf(current);
  const amtB = requestedAmountOf(other);
  const sameAmount = amtA > 0 && amtA === amtB;

  const eidA = expenseIdOf(current);
  const eidB = expenseIdOf(other);
  if (eidA && eidB && eidA === eidB) reasons.push('Linked to the same expense');

  const payeeA = normalizeExpensePayeeKey(current.payeeName || current.payee_name);
  const payeeB = normalizeExpensePayeeKey(other.payeeName || other.payee_name);
  if (payeeA && payeeB && payeeA === payeeB && sameAmount) reasons.push('Same payee and amount');

  const acctA = payeeAccountKey(current);
  const acctB = payeeAccountKey(other);
  if (acctA && acctB && acctA === acctB && sameAmount) reasons.push('Same account and amount');

  const woA = workOrderKey(current);
  const woB = workOrderKey(other);
  if (woA && woB && woA === woB) reasons.push('Same work order');

  const memoA = memoKey(current);
  const memoB = memoKey(other);
  if (memoA && memoB && memoA === memoB && memoA !== '—' && sameAmount) reasons.push('Same memo and amount');

  return reasons[0] || null;
}

/**
 * Open/recent requests that cashiers should compare before paying (or after payout).
 * @returns {{ request: object, reason: string }[]}
 */
export function findSimilarPaymentRequests(current, paymentRequests = [], { limit = 8 } = {}) {
  const selfId = requestIdOf(current);
  const selfExpense = expenseIdOf(current);
  const hits = [];
  for (const pr of paymentRequests || []) {
    const id = requestIdOf(pr);
    if (selfId && id && id === selfId) continue;
    if (!selfId && selfExpense && expenseIdOf(pr) === selfExpense && !id) continue;
    const reason = similarPaymentRequestReason(current, pr);
    if (!reason) continue;
    hits.push({ request: pr, reason });
  }
  hits.sort((a, b) => {
    const aPaid = (Number(a.request.paidAmountNgn) || 0) > 0 ? 1 : 0;
    const bPaid = (Number(b.request.paidAmountNgn) || 0) > 0 ? 1 : 0;
    if (aPaid !== bPaid) return bPaid - aPaid;
    return String(b.request.requestDate || b.request.request_date || '').localeCompare(
      String(a.request.requestDate || a.request.request_date || '')
    );
  });
  return hits.slice(0, limit);
}

/** Treasury outflows posted against this payment request. */
export function expenseCashierTreasuryPayouts(requestId, movements = []) {
  const id = String(requestId || '').trim();
  if (!id) return [];
  return (Array.isArray(movements) ? movements : []).filter(
    (m) => String(m.sourceKind || '').trim() === 'PAYMENT_REQUEST' && String(m.sourceId || '').trim() === id
  );
}
