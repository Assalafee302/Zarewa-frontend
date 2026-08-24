import { formatNgn } from '../Data/mockData.js';
import { bookedPaidNgnForQuotationFromMirrors } from './liveAnalytics.js';
import { isEffectivelyFullyPaid } from './paymentOutstandingTolerance.js';
import {
  receiptEffectiveCashNgn,
  receiptSalesPaymentStatusLabel,
} from './receiptClearance.js';

/** Finance desk hides leftover crumbs so cashiers collect balances still worth chasing. */
export const PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN = 999;

/** Count live/imported payment rows per quotation (excludes rows without a quote link). */
export function paymentCountByQuotationRef(mergedReceipts) {
  const map = new Map();
  for (const r of mergedReceipts || []) {
    const ref = String(r.quotationRef || '').trim();
    if (!ref) continue;
    map.set(ref, (map.get(ref) || 0) + 1);
  }
  return map;
}

/**
 * Paid on quote from stored row or live receipt/ledger mirrors (whichever is higher).
 * @param {object} q
 * @param {{ salesReceipts?: object[]; ledgerEntries?: object[] }} [opts]
 */
export function quotationEffectivePaidNgn(q, opts = {}) {
  const stored = Math.round(Number(q?.paidNgn ?? q?.paid_ngn) || 0);
  const id = String(q?.id || '').trim();
  if (!id) return stored;
  const { salesReceipts, ledgerEntries } = opts;
  if (!salesReceipts?.length && !ledgerEntries?.length) return stored;
  const fromMirrors = bookedPaidNgnForQuotationFromMirrors(salesReceipts, ledgerEntries, id);
  return Math.max(stored, fromMirrors);
}

/**
 * Payment chip label — derived from paid vs total, not stale `paymentStatus` alone.
 * @param {object} q
 * @param {{ salesReceipts?: object[]; ledgerEntries?: object[] }} [opts]
 */
export function quotationDisplayPaymentStatus(q, opts = {}) {
  const paid = quotationEffectivePaidNgn(q, opts);
  const total = Math.round(Number(q?.totalNgn ?? q?.total_ngn) || 0);
  if (paid <= 0) return 'Unpaid';
  if (isEffectivelyFullyPaid(paid, total)) return 'Paid';
  return 'Partial';
}

const SKIP_PARTIAL_QUOTE_STATUSES = new Set(['cancelled', 'rejected', 'void']);

function quoteRefOf(row) {
  return String(row?.quotationRef || row?.quotation_ref || '').trim();
}

function moneyDateOf(row) {
  return String(row?.dateISO || row?.date || row?.atISO || row?.postedAtISO || '').slice(0, 10);
}

function ledgerKindLabel(type) {
  return String(type || 'Ledger')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isQuoteMoneyLedgerType(type) {
  const t = String(type || '').toUpperCase();
  return /RECEIPT|ADVANCE|OVERPAY|REFUND|CREDIT/.test(t);
}

/**
 * Live quotations with a remaining customer balance after a partial payment.
 * @param {object[]} quotations
 * @param {{ salesReceipts?: object[]; ledgerEntries?: object[]; minBalanceNgn?: number }} [payOpts]
 */
export function quotationsStillToBalanceRows(quotations = [], payOpts = {}) {
  const minBalanceNgn = Math.round(Number(payOpts.minBalanceNgn) || 0);
  return (Array.isArray(quotations) ? quotations : [])
    .filter((q) => {
      const status = String(q?.status || '').trim().toLowerCase();
      if (SKIP_PARTIAL_QUOTE_STATUSES.has(status)) return false;
      return quotationDisplayPaymentStatus(q, payOpts) === 'Partial';
    })
    .map((q) => {
      const paid = quotationEffectivePaidNgn(q, payOpts);
      const total = Math.round(Number(q?.totalNgn ?? q?.total_ngn) || 0);
      return {
        id: String(q.id || q.quotationID || ''),
        date: String(q.dateISO || q.date || '').slice(0, 10),
        customer: q.customer || q.customerName || q.customerID || '—',
        customerID: String(q.customerID || q.customer_id || '').trim(),
        quotation: q,
        paid,
        total,
        balance: Math.max(0, total - paid),
      };
    })
    .filter((row) => row.balance > minBalanceNgn)
    .sort((a, b) => b.balance - a.balance);
}

/**
 * Receipts and quote-linked money ledger for a partial-balance popup.
 * @param {{ quotationId?: string, receipts?: object[], ledgerEntries?: object[] }} opts
 */
export function quotationBalanceTransactions({ quotationId, receipts = [], ledgerEntries = [] } = {}) {
  const qid = String(quotationId || '').trim();
  if (!qid) return [];

  const reversedIds = new Set(
    (Array.isArray(ledgerEntries) ? ledgerEntries : [])
      .filter((e) => String(e.type || '').toUpperCase() === 'RECEIPT_REVERSAL')
      .map((e) => {
        const m = String(e.bankReference || e.note || '').match(/REVERSAL_OF:([A-Za-z0-9-]+)/);
        return m ? m[1] : String(e.reversesEntryId || e.reverses_entry_id || '').trim();
      })
      .filter(Boolean)
  );

  const receiptRows = (Array.isArray(receipts) ? receipts : [])
    .filter((r) => quoteRefOf(r) === qid)
    .filter((r) => String(r.status || '').toLowerCase() !== 'reversed')
    .filter((r) => !reversedIds.has(String(r.id || r.ledgerEntryId || '').trim()))
    .map((r) => ({
      key: `rc-${r.id || r.receiptID || moneyDateOf(r)}`,
      kind: 'receipt',
      id: String(r.id || r.receiptID || '—'),
      date: moneyDateOf(r),
      label: 'Receipt',
      detail: [r.method, r.bankReference || r.reference || r.note].filter(Boolean).join(' · ') || 'Customer payment',
      amountNgn: receiptEffectiveCashNgn(r),
      statusLabel: receiptSalesPaymentStatusLabel(r),
      receipt: r,
    }));

  const shownIds = new Set(receiptRows.flatMap((r) => [r.id, String(r.receipt?.ledgerEntryId || '').trim()].filter(Boolean)));

  const ledgerRows = (Array.isArray(ledgerEntries) ? ledgerEntries : [])
    .filter((e) => quoteRefOf(e) === qid && isQuoteMoneyLedgerType(e.type))
    .filter((e) => {
      const id = String(e.id || '').trim();
      if (shownIds.has(id)) return false;
      if (String(e.type || '').toUpperCase() === 'RECEIPT' && shownIds.has(id)) return false;
      return true;
    })
    .map((e) => {
      const t = String(e.type || '').toUpperCase();
      const amount = Math.round(Number(e.amountNgn) || 0);
      const isOut = /REVERSAL|REFUND|OUT/.test(t) && !/APPLIED|CREDIT/.test(t);
      return {
        key: `le-${e.id || t}-${moneyDateOf(e)}`,
        kind: 'ledger',
        id: String(e.id || '—'),
        date: moneyDateOf(e),
        label: ledgerKindLabel(e.type),
        detail: String(e.note || e.bankReference || e.purpose || '').trim() || 'Ledger',
        amountNgn: isOut ? -Math.abs(amount) : amount,
        statusLabel: ledgerKindLabel(e.type),
        receipt: null,
      };
    });

  return [...receiptRows, ...ledgerRows].sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id))
  );
}

/**
 * Second line on quotation list cards: paid vs total, payment count, balance.
 * @param {object} q quotation row
 * @param {number} [paymentCount] from paymentCountByQuotationRef
 * @param {{ salesReceipts?: object[]; ledgerEntries?: object[] }} [opts]
 */
export function quotationListPaymentMeta(q, paymentCount = 0, opts = {}) {
  const paid = quotationEffectivePaidNgn(q, opts);
  const total = Math.round(Number(q?.totalNgn ?? q?.total_ngn) || 0);
  const balance = Math.max(0, total - paid);
  const n = Math.max(0, Math.round(Number(paymentCount) || 0));
  const countLabel = n === 0 ? 'No payments yet' : n === 1 ? '1 payment' : `${n} payments`;
  const balLabel = balance > 0 ? `Bal ${formatNgn(balance)}` : 'Settled';
  const date = String(q?.date || '').trim();
  const payLabel = `Paid ${formatNgn(paid)} / ${formatNgn(total)}`;
  return [date, payLabel, countLabel, balLabel].filter(Boolean).join(' · ');
}

/** True when modal `editData` is an existing posted payment (not a quotation shortcut). */
export function isExistingSalesPaymentRow(editData) {
  if (!editData) return false;
  if (editData.source === 'ledger' || editData._ledgerEntry) return true;
  if (editData.ledgerEntryId) return true;
  const id = String(editData.id || '').trim();
  if (id.startsWith('RC-')) return true;
  if (editData.quotationRef && id && !id.startsWith('QT-')) return true;
  return false;
}

/** Opened from a quotation row to post the next instalment (QT-… id, no receipt fields). */
export function isQuotationAddPaymentContext(editData) {
  if (!editData?.id || isExistingSalesPaymentRow(editData)) return false;
  const id = String(editData.id).trim();
  if (id.startsWith('QT-')) return true;
  if (editData.totalNgn != null && !editData.quotationRef && !editData.source) return true;
  return false;
}
