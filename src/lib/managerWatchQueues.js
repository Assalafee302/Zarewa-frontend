/**
 * Branch-manager Watch desk: waiting queues with age (cutting lists, receipts,
 * expenses awaiting payout, refunds, coil requests, mill blocks) plus treasury cash.
 *
 * Pure snapshot math — no fetch. Pass `nowMs` in tests.
 */

import { coilRequestIsPending } from './coilRequestStatus.js';
import { classifyPaymentRequestStatus } from './managerSpendInsights.js';
import { isReceiptPendingClearance, isReceiptReversed } from './receiptClearance.js';
import { isRefundPayable, refundOutstandingAmount } from './refundsStore.js';
import {
  treasuryAccountDisplayName,
  treasuryAccountsForWorkspace,
} from './treasuryAccountsStore.js';
import { treasuryBookBalanceByAccountId, treasuryBookDisplayNgn } from './financeDeskTreasury.js';

export const MANAGER_WATCH_WARN_HOURS = 24;
export const MANAGER_WATCH_URGENT_HOURS = 48;
const QUEUE_CAP = 12;

const CUTTING_CLOSED = new Set([
  'finished',
  'completed',
  'cancelled',
  'canceled',
  'void',
  'archived',
]);

const JOB_OPEN = new Set(['planned', 'queued', 'running', 'in_progress', 'in-progress', 'active']);

function listFrom(snapshot, ...keys) {
  for (const key of keys) {
    if (Array.isArray(snapshot?.[key])) return snapshot[key];
  }
  return [];
}

function pick(row, ...keys) {
  if (!row || typeof row !== 'object') return undefined;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function asNgn(v) {
  const n = Math.round(Number(v) || 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {unknown} iso
 * @param {number} nowMs
 * @returns {number | null}
 */
export function waitHoursFromIso(iso, nowMs = Date.now()) {
  const raw = String(iso || '').trim();
  if (!raw) return null;
  const t = new Date(raw).getTime();
  if (Number.isFinite(t)) return Math.max(0, (nowMs - t) / 36e5);
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t2 = new Date(`${day}T00:00:00`).getTime();
  if (!Number.isFinite(t2)) return null;
  return Math.max(0, (nowMs - t2) / 36e5);
}

/**
 * @param {number | null | undefined} hours
 * @returns {{ label: string; tone: 'ok' | 'watch' | 'warn' | 'urgent' | 'unknown' }}
 */
export function waitTone(hours) {
  if (hours == null || !Number.isFinite(hours)) return { label: 'Age unknown', tone: 'unknown' };
  const h = Math.max(0, hours);
  let label;
  if (h < 1) label = `${Math.max(1, Math.round(h * 60))} min`;
  else if (h < 24) label = `${Math.round(h)}h`;
  else {
    const days = Math.floor(h / 24);
    const rem = Math.round(h - days * 24);
    label = rem > 0 && days < 7 ? `${days}d ${rem}h` : `${days}d`;
  }
  const tone =
    h >= MANAGER_WATCH_URGENT_HOURS
      ? 'urgent'
      : h >= MANAGER_WATCH_WARN_HOURS
        ? 'warn'
        : h >= 8
          ? 'watch'
          : 'ok';
  return { label, tone };
}

function firstIso(row, keys, nowMs) {
  for (const key of keys) {
    const hours = waitHoursFromIso(pick(row, key), nowMs);
    if (hours != null) return { iso: pick(row, key), hours };
  }
  return { iso: '', hours: null };
}

function sortOldestFirst(items) {
  return [...items].sort((a, b) => {
    const ah = a.waitHours == null ? -1 : a.waitHours;
    const bh = b.waitHours == null ? -1 : b.waitHours;
    if (ah < 0 && bh < 0) return 0;
    if (ah < 0) return 1;
    if (bh < 0) return -1;
    return bh - ah;
  });
}

function queueStats(items) {
  const list = Array.isArray(items) ? items : [];
  let oldestHours = null;
  let agedCount = 0;
  for (const it of list) {
    const h = it.waitHours;
    if (h == null || !Number.isFinite(h)) continue;
    if (oldestHours == null || h > oldestHours) oldestHours = h;
    if (h >= MANAGER_WATCH_WARN_HOURS) agedCount += 1;
  }
  return {
    items: sortOldestFirst(list).slice(0, QUEUE_CAP),
    count: list.length,
    agedCount,
    oldestHours,
    overflow: Math.max(0, list.length - QUEUE_CAP),
  };
}

function cuttingAwaitingProduction(cuttingLists, nowMs) {
  const items = [];
  for (const cl of cuttingLists) {
    const status = String(pick(cl, 'status') || '').trim().toLowerCase();
    if (CUTTING_CLOSED.has(status)) continue;
    const registered = Boolean(pick(cl, 'productionRegistered', 'production_registered'));
    const releasePending = Boolean(
      pick(cl, 'productionReleasePending', 'production_release_pending')
    );
    if (registered && !releasePending) continue;
    const wait = firstIso(cl, ['dateISO', 'date_iso', 'createdAtISO', 'created_at_iso', 'date'], nowMs);
    const metres = Number(pick(cl, 'totalMeters', 'total_meters', 'meters')) || 0;
    const quote = pick(cl, 'quotationRef', 'quotation_ref');
    items.push({
      id: String(pick(cl, 'id') || ''),
      title: String(pick(cl, 'id') || 'Cutting list'),
      subtitle: [
        pick(cl, 'customer', 'customerName', 'customer_name') || 'Customer',
        quote ? `Quote ${quote}` : '',
        metres > 0 ? `${metres.toLocaleString('en-NG')} m` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: 0,
      reason: releasePending ? 'Release hold — not on mill' : 'Not registered for production',
    });
  }
  return items;
}

function receiptsAwaitingConfirmation(receipts, nowMs) {
  const items = [];
  for (const row of receipts) {
    if (isReceiptReversed(row) || !isReceiptPendingClearance(row)) continue;
    const wait = firstIso(
      row,
      ['dateISO', 'date_iso', 'createdAtISO', 'created_at_iso', 'postedAtISO', 'date'],
      nowMs
    );
    items.push({
      id: String(pick(row, 'id') || ''),
      title: String(pick(row, 'id') || 'Receipt'),
      subtitle: [
        pick(row, 'customer', 'customerName', 'customer_name') || 'Customer',
        pick(row, 'quotationRef', 'quotation_ref') || '',
        pick(row, 'method', 'paymentMethod') || '',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: asNgn(pick(row, 'amountNgn', 'amount_ngn', 'cashReceivedNgn')),
      reason: 'Posted — cashier has not confirmed',
    });
  }
  return items;
}

function expensesAwaitingPayout(paymentRequests, nowMs) {
  const items = [];
  for (const pr of paymentRequests) {
    const requested = asNgn(pick(pr, 'amountRequestedNgn', 'amount_requested_ngn'));
    const paid = asNgn(pick(pr, 'paidAmountNgn', 'paid_amount_ngn'));
    const normalized = {
      ...pr,
      approvalStatus: pick(pr, 'approvalStatus', 'approval_status') || '',
      amountRequestedNgn: requested,
      paidAmountNgn: paid,
    };
    const status = classifyPaymentRequestStatus(normalized);
    if (status !== 'approved_awaiting' && status !== 'partial') continue;
    const wait = firstIso(
      pr,
      ['approvedAtISO', 'approved_at_iso', 'requestDate', 'request_date', 'createdAtISO'],
      nowMs
    );
    items.push({
      id: String(pick(pr, 'requestID', 'request_id', 'id') || ''),
      title: String(pick(pr, 'requestID', 'request_id', 'id') || 'Expense'),
      subtitle: [
        pick(pr, 'description', 'payeeName', 'payee_name') || 'Expense',
        pick(pr, 'expenseCategory', 'expense_category') || '',
        status === 'partial' ? 'Part paid' : 'Approved',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: Math.max(0, requested - paid),
      reason: status === 'partial' ? 'Balance still with cashier' : 'Approved — awaiting cashier payout',
    });
  }
  return items;
}

function refundsAwaitingPayout(refunds, nowMs) {
  const items = [];
  for (const r of refunds) {
    if (!isRefundPayable(r)) continue;
    const wait = firstIso(
      r,
      ['approvedAtISO', 'approved_at_iso', 'requestedAtISO', 'requested_at_iso'],
      nowMs
    );
    items.push({
      id: String(pick(r, 'refundID', 'refund_id', 'id') || ''),
      title: String(pick(r, 'refundID', 'refund_id', 'id') || 'Refund'),
      subtitle: [
        pick(r, 'customer', 'customerName', 'customer_name') || 'Customer',
        pick(r, 'quotationRef', 'quotation_ref') || '',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: asNgn(refundOutstandingAmount(r) || pick(r, 'amountNgn', 'amount_ngn')),
      reason: 'Approved — cash not paid out',
    });
  }
  return items;
}

function coilRequestsPending(coilRequests, nowMs) {
  const items = [];
  for (const row of coilRequests) {
    if (!coilRequestIsPending(row?.status)) continue;
    const wait = firstIso(
      row,
      ['createdAtISO', 'created_at_iso', 'requestedAtISO', 'requested_at_iso'],
      nowMs
    );
    const qty = pick(row, 'requestedKg', 'requested_kg', 'qty');
    items.push({
      id: String(pick(row, 'id') || ''),
      title: String(pick(row, 'id') || 'Stock request'),
      subtitle: [
        [pick(row, 'materialType', 'material_type'), pick(row, 'colour'), pick(row, 'gauge')]
          .filter(Boolean)
          .join(' · ') || 'Coil / stock',
        qty != null ? String(qty) : '',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: 0,
      reason: 'Store request awaiting your approval',
    });
  }
  return items;
}

function millBlockedJobs(productionJobs, nowMs) {
  const items = [];
  for (const job of productionJobs) {
    const status = String(pick(job, 'status') || '').trim().toLowerCase();
    if (status === 'completed' || status === 'cancelled' || status === 'canceled') continue;
    const needsCoil = Boolean(pick(job, 'needsCoil', 'needs_coil'));
    const review = Boolean(pick(job, 'managerReviewRequired', 'manager_review_required'));
    const open = JOB_OPEN.has(status) || !status;
    const endIso = String(pick(job, 'endDateISO', 'end_date_iso') || '').slice(0, 10);
    const today = new Date(nowMs).toISOString().slice(0, 10);
    const overdue = Boolean(endIso && endIso < today && open);
    if (!needsCoil && !review && !overdue) continue;
    const wait = firstIso(job, ['createdAtISO', 'created_at_iso', 'startDateISO', 'start_date_iso'], nowMs);
    const reason = needsCoil
      ? 'No coil allocated — mill blocked'
      : review
        ? 'Conversion review sitting with you'
        : 'Past due date';
    items.push({
      id: String(pick(job, 'jobID', 'job_id', 'id') || ''),
      title: String(pick(job, 'jobID', 'job_id', 'id') || 'Job'),
      subtitle: [
        pick(job, 'customerName', 'customer_name', 'customer') || '',
        pick(job, 'productName', 'product_name') || '',
        pick(job, 'quotationRef', 'quotation_ref') || '',
      ]
        .filter(Boolean)
        .join(' · '),
      waitHours: wait.hours,
      waitIso: wait.iso,
      amountNgn: 0,
      reason,
    });
  }
  return items;
}

function bankBalances(snapshot, session) {
  const accounts = treasuryAccountsForWorkspace(snapshot, session);
  const movements = listFrom(snapshot, 'treasuryMovements', 'treasury_movements');
  const bookById = treasuryBookBalanceByAccountId(accounts, movements);
  const mapped = accounts.map((acc) => {
    const bookNgn = treasuryBookDisplayNgn(acc, bookById);
    return {
      id: acc.id,
      name: treasuryAccountDisplayName(acc) || acc.name || 'Account',
      type: acc.type === 'Cash' ? 'Cash' : 'Bank',
      accNo: acc.accNo || '',
      bookNgn,
    };
  });
  mapped.sort((a, b) => b.bookNgn - a.bookNgn);
  const totalNgn = mapped.reduce((s, a) => s + a.bookNgn, 0);
  const bankNgn = mapped.filter((a) => a.type === 'Bank').reduce((s, a) => s + a.bookNgn, 0);
  const cashNgn = mapped.filter((a) => a.type === 'Cash').reduce((s, a) => s + a.bookNgn, 0);
  return { accounts: mapped, totalNgn, bankNgn, cashNgn };
}

/**
 * @param {object | null | undefined} snapshot
 * @param {{ session?: object; nowMs?: number }} [opts]
 */
export function buildManagerWatchModel(snapshot, opts = {}) {
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const productionItems = cuttingAwaitingProduction(
    listFrom(snapshot, 'cuttingLists', 'cutting_lists'),
    nowMs
  );
  const receiptItems = receiptsAwaitingConfirmation(listFrom(snapshot, 'receipts'), nowMs);
  const expenseItems = expensesAwaitingPayout(
    listFrom(snapshot, 'paymentRequests', 'payment_requests'),
    nowMs
  );
  const refundItems = refundsAwaitingPayout(listFrom(snapshot, 'refunds'), nowMs);
  const coilItems = coilRequestsPending(listFrom(snapshot, 'coilRequests', 'coil_requests'), nowMs);
  const millItems = millBlockedJobs(listFrom(snapshot, 'productionJobs', 'production_jobs'), nowMs);

  const production = queueStats(productionItems);
  const receipts = {
    ...queueStats(receiptItems),
    totalNgn: receiptItems.reduce((s, r) => s + asNgn(r.amountNgn), 0),
  };
  const expenses = {
    ...queueStats(expenseItems),
    totalNgn: expenseItems.reduce((s, r) => s + asNgn(r.amountNgn), 0),
  };
  const refunds = {
    ...queueStats(refundItems),
    totalNgn: refundItems.reduce((s, r) => s + asNgn(r.amountNgn), 0),
  };
  const coilRequests = queueStats(coilItems);
  const millBlocked = queueStats(millItems);
  const banks = bankBalances(snapshot, opts.session);

  const waitingCount =
    production.count +
    receipts.count +
    expenses.count +
    refunds.count +
    coilRequests.count +
    millBlocked.count;
  const agedCount =
    production.agedCount +
    receipts.agedCount +
    expenses.agedCount +
    refunds.agedCount +
    coilRequests.agedCount +
    millBlocked.agedCount;
  const oldestHours = [
    production.oldestHours,
    receipts.oldestHours,
    expenses.oldestHours,
    refunds.oldestHours,
    coilRequests.oldestHours,
    millBlocked.oldestHours,
  ].reduce((max, h) => (h != null && (max == null || h > max) ? h : max), null);

  return {
    production,
    receipts,
    expenses,
    refunds,
    coilRequests,
    millBlocked,
    banks,
    totals: { waitingCount, agedCount, oldestHours },
  };
}
