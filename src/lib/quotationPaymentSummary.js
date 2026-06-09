import { formatNgn } from '../Data/mockData.js';
import { bookedPaidNgnForQuotationFromMirrors } from './liveAnalytics.js';
import { isEffectivelyFullyPaid } from './paymentOutstandingTolerance.js';

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
