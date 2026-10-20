/**
 * Finance Phase A (A3): every desk headline counts and sums ONE list, so "n" and "₦x"
 * always describe the same items.
 *
 * - Pending receipts: awaiting confirmation, not held. Suspended / under-investigation
 *   receipts are their own line and never folded into the pending total.
 * - Payouts to post / Pay out: one line per refund payee, expense, register withdrawal and
 *   haulage PO. "Ready" is the part of that same list with cash payable now (not on hold).
 */
import { refundLineReadyNgn, haulageReadyNgn } from './financePayoutDesk.js';
import { paymentRequestOutstandingNgn, registerSettlementOutstandingNgn } from './financeTreasuryPayoutQueueMeta.js';

function money(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

/** @template T @param {T[]} list @param {(item: T) => number} amountOf */
export function countAndSum(list, amountOf) {
  const items = Array.isArray(list) ? list : [];
  return { count: items.length, ngn: items.reduce((s, item) => s + money(amountOf(item)), 0) };
}

/**
 * @param {{ pending: object[], held: object[], amountOf: (receipt: object) => number }} p
 *   `pending` and `held` are disjoint lists of unconfirmed receipts.
 */
export function receiptHeadlines({ pending = [], held = [], amountOf }) {
  return { pending: countAndSum(pending, amountOf), held: countAndSum(held, amountOf) };
}

/**
 * Normalise every payout queue into one list.
 * @returns {Array<{ kind: 'refund' | 'expense' | 'withdrawal' | 'haulage', id: string, openNgn: number, readyNgn: number }>}
 */
export function deskPayoutLines({ refundLines = [], paymentRequests = [], registerSettlements = [], haulage = [] } = {}) {
  const out = [];
  for (const line of refundLines || []) {
    out.push({
      kind: 'refund',
      id: `${line?.refundID || ''}:${line?.queueKey || ''}`,
      openNgn: money(line?.amountDueNgn),
      readyNgn: refundLineReadyNgn(line),
    });
  }
  for (const req of paymentRequests || []) {
    const n = money(paymentRequestOutstandingNgn(req));
    out.push({ kind: 'expense', id: String(req?.requestID || req?.id || ''), openNgn: n, readyNgn: n });
  }
  for (const s of registerSettlements || []) {
    const n = money(registerSettlementOutstandingNgn(s));
    out.push({ kind: 'withdrawal', id: String(s?.settlementId || ''), openNgn: n, readyNgn: n });
  }
  for (const row of haulage || []) {
    out.push({
      kind: 'haulage',
      id: String(row?.poID || row?.poId || ''),
      openNgn: money(row?.outstandingNgn),
      readyNgn: haulageReadyNgn(row),
    });
  }
  return out;
}

/** Open = every line; Ready = the lines with cash payable now; both counted and summed on the same list. */
export function payoutHeadline(lines = []) {
  const all = Array.isArray(lines) ? lines : [];
  const ready = all.filter((l) => l.readyNgn > 0);
  return {
    openCount: all.length,
    openNgn: all.reduce((s, l) => s + l.openNgn, 0),
    readyCount: ready.length,
    readyNgn: ready.reduce((s, l) => s + l.readyNgn, 0),
    notReadyCount: all.length - ready.length,
  };
}
