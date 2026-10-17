import { payoutAccountIsMissing, payoutAccountProblem } from '../shared/lib/payoutAccountGuard.js';

/**
 * Cashier and desk payout queues: filter, sort, and aging.
 * Amounts stay on the row; this module only orders and summarises them.
 */

/** @param {string} isoDate @param {Date} [today] */
export function payoutAgeDays(isoDate, today = new Date()) {
  const day = String(isoDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const start = Date.UTC(year, month - 1, date);
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((end - start) / 86400000));
}

/** @param {object} row */
export function payoutDueSearchBlob(row) {
  return [row?.kind, row?.party, row?.ref, row?.id, row?.date, row?.statusLabel, row?.amount]
    .filter((value) => value != null && value !== '')
    .join(' ')
    .toLowerCase();
}

/**
 * @param {object[]} rows
 * @param {{ query?: string, kind?: string, status?: string }} [filters]
 */
export function filterPayoutDueRows(rows, { query = '', kind = 'all', status = 'all' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return (rows || []).filter((row) => {
    if (kind !== 'all' && row.kindKey !== kind) return false;
    if (status === 'ready' && !row.payable) return false;
    if (status === 'held' && row.payable) return false;
    if (q && !payoutDueSearchBlob(row).includes(q)) return false;
    return true;
  });
}

/**
 * Ready lines stay ahead of held lines when the chosen key ties,
 * so a work queue does not bury money that can be paid today.
 * @param {object[]} rows
 * @param {string} [key]
 * @param {'asc' | 'desc'} [dir]
 */
export function sortPayoutDueRows(rows, key = 'date', dir = 'desc') {
  const mult = dir === 'asc' ? 1 : -1;
  return [...(rows || [])].sort((a, b) => {
    let cmp = 0;
    if (key === 'amount') cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
    else if (key === 'payee') {
      cmp = String(a.party || '').localeCompare(String(b.party || ''), undefined, { sensitivity: 'base' });
    } else if (key === 'type') {
      cmp = String(a.kind || '').localeCompare(String(b.kind || ''), undefined, { sensitivity: 'base' });
    } else if (key === 'age') cmp = (a.ageDays ?? -1) - (b.ageDays ?? -1);
    else cmp = String(a.date || '').localeCompare(String(b.date || ''));
    if (cmp !== 0) return cmp * mult;
    if (Boolean(a.payable) !== Boolean(b.payable)) return a.payable ? -1 : 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

/** @param {object[]} rows */
export function summarizePayoutDue(rows) {
  let payableCount = 0;
  let payableNgn = 0;
  let heldCount = 0;
  let heldNgn = 0;
  let oldestReadyDays = null;
  /** @type {Record<string, number>} */
  const byKind = {};
  for (const row of rows || []) {
    const kindKey = String(row.kindKey || 'other');
    byKind[kindKey] = (byKind[kindKey] || 0) + 1;
    if (row.payable) {
      payableCount += 1;
      payableNgn += Math.round(Number(row.amount) || 0);
      if (row.ageDays != null && (oldestReadyDays == null || row.ageDays > oldestReadyDays)) {
        oldestReadyDays = row.ageDays;
      }
    } else {
      heldCount += 1;
      heldNgn += Math.round(Number(row.heldAmount) || 0);
    }
  }
  return { payableCount, payableNgn, heldCount, heldNgn, oldestReadyDays, byKind };
}

/** @param {string} blob @param {string} query */
export function matchesPayoutQuery(blob, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(blob || '').toLowerCase().includes(q);
}

/**
 * @template T
 * @param {T[]} items
 * @param {string} mode date_desc | date_asc | amount_desc | amount_asc
 * @param {(item: T) => number} getAmount
 * @param {(item: T) => string} getDate
 */
export function sortPayoutQueue(items, mode, getAmount, getDate) {
  const desc = !String(mode || '').endsWith('asc');
  const byAmount = String(mode || '').startsWith('amount');
  const mult = desc ? -1 : 1;
  return [...(items || [])].sort((a, b) => {
    const cmp = byAmount
      ? (Number(getAmount(a)) || 0) - (Number(getAmount(b)) || 0)
      : String(getDate(a) || '').localeCompare(String(getDate(b) || ''));
    if (cmp !== 0) return cmp * mult;
    return 0;
  });
}

/**
 * @template T
 * @param {T[]} rows
 * @param {string} key
 * @param {'asc' | 'desc'} dir
 * @param {Record<string, (row: T) => string | number>} getters
 */
export function sortKeyedRows(rows, key, dir, getters) {
  const mult = dir === 'asc' ? 1 : -1;
  const get = getters?.[key] || getters?.date;
  if (!get) return [...(rows || [])];
  return [...(rows || [])].sort((a, b) => {
    const left = get(a);
    const right = get(b);
    const cmp =
      typeof left === 'number' || typeof right === 'number'
        ? (Number(left) || 0) - (Number(right) || 0)
        : String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
    if (cmp !== 0) return cmp * mult;
    return String(a?.id || a?.requestID || a?.refundID || '').localeCompare(
      String(b?.id || b?.requestID || b?.refundID || '')
    );
  });
}

function refundParentOnPayoutHold(line) {
  const r = line?.parentRefund || line || {};
  return r.payoutHold === true || r.payoutHold === 1 || r.payout_hold === 1 || r.payout_hold === '1';
}

function haulageOnPayoutHold(row) {
  return (
    row?.transportPayoutHold === true ||
    row?.transportPayoutHold === 1 ||
    row?.transport_payout_hold === 1 ||
    row?.transport_payout_hold === '1'
  );
}

/** Cash still to pay. A row on hold stays visible and contributes 0. */
export function refundLineReadyNgn(line) {
  if (refundParentOnPayoutHold(line)) return 0;
  return Math.max(0, Math.round(Number(line?.amountDueNgn) || 0));
}

/** Unpaid haulage. A held PO stays visible and contributes 0. */
export function haulageReadyNgn(row) {
  if (haulageOnPayoutHold(row)) return 0;
  return Math.max(0, Math.round(Number(row?.outstandingNgn) || 0));
}

/** @param {string} prevKey @param {'asc'|'desc'} prevDir @param {string} key */
export function nextPayoutSort(prevKey, prevDir, key) {
  if (prevKey === key) {
    return { key, dir: prevDir === 'asc' ? 'desc' : 'asc' };
  }
  const dir = key === 'payee' || key === 'type' ? 'asc' : 'desc';
  return { key, dir };
}

/**
 * Finance Phase A (A1): a desk payout line can be paid only when its payee has a bank and a
 * 10-digit account. A refund is paid as one request, so a payee with a missing account on the
 * same refund also blocks the other payees' Pay buttons.
 * @param {{ payeeBankName?: string, payeeAccountNo?: string }} line
 * @param {Array<{ payeeBankName?: string, payeeAccountNo?: string, recipientLabel?: string, queueKey?: string }>} [siblings]
 * @returns {{ missing: boolean, problem: string, blockedBy: string }}
 */
export function payoutLineAccountGate(line, siblings = []) {
  const problem = payoutAccountProblem({ bankName: line?.payeeBankName, accountNo: line?.payeeAccountNo });
  if (problem) return { missing: true, problem, blockedBy: '' };
  const other = (siblings || []).find(
    (s) =>
      s &&
      s.queueKey !== line?.queueKey &&
      (Number(s.amountDueNgn) || 0) > 0 &&
      payoutAccountIsMissing({ bankName: s.payeeBankName, accountNo: s.payeeAccountNo })
  );
  return { missing: false, problem: '', blockedBy: other ? String(other.recipientLabel || other.payeeName || 'Another payee') : '' };
}

/** A4: refund queue age from the approval day. >7 days amber, >30 days red. */
export const REFUND_OVERDUE_DAYS = 7;
export const REFUND_LATE_DAYS = 30;

export function refundApprovedDayISO(refund) {
  return String(refund?.approvedAtISO || refund?.approvalDate || refund?.approval_date || refund?.dateISO || '').slice(0, 10);
}

/** @returns {{ days: number | null, tone: 'none' | 'amber' | 'red' }} */
export function refundQueueAge(refund, today = new Date()) {
  const days = payoutAgeDays(refundApprovedDayISO(refund), today);
  if (days == null) return { days: null, tone: 'none' };
  if (days > REFUND_LATE_DAYS) return { days, tone: 'red' };
  if (days > REFUND_OVERDUE_DAYS) return { days, tone: 'amber' };
  return { days, tone: 'none' };
}

/**
 * A4 desk tile: refunds approved more than 7 days ago that still have cash to pay.
 * Counts refunds (not payee lines) and sums what is left to pay on those same refunds.
 * @param {Array<{ refundID: string, amountDueNgn?: number, parentRefund?: object }>} refundLines
 */
export function overdueRefundsHeadline(refundLines = [], today = new Date()) {
  const byRefund = new Map();
  for (const line of refundLines || []) {
    const due = Math.max(0, Math.round(Number(line?.amountDueNgn) || 0));
    if (due <= 0) continue;
    const age = refundQueueAge(line?.parentRefund || line, today);
    if (age.days == null || age.days <= REFUND_OVERDUE_DAYS) continue;
    const id = String(line?.refundID || '');
    byRefund.set(id, (byRefund.get(id) || 0) + due);
  }
  let ngn = 0;
  for (const v of byRefund.values()) ngn += v;
  return { count: byRefund.size, ngn };
}
