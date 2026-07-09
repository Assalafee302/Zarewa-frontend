import { receiptCashReceivedNgn } from './salesReceiptsList';
import { productionGateOverrideEffective } from './productionGateAccess';

function normQuoteKey(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function cuttingListMinPaidFractionFromSession(session) {
  const bid = String(session?.currentBranchId || '').trim();
  const branches = Array.isArray(session?.branches) ? session.branches : [];
  const row = branches.find((b) => String(b.id) === bid);
  const f = Number(row?.cuttingListMinPaidFraction);
  if (Number.isFinite(f) && f >= 0.05 && f <= 1) return f;
  return 0.7;
}

function bookPaidTowardQuotation(q) {
  return Math.max(0, Number(q?.paidNgn ?? q?.paid_ngn) || 0);
}

function sumAdvanceAppliedNgnForQuotation(ledgerEntries, quotationId) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey || !Array.isArray(ledgerEntries)) return 0;
  let s = 0;
  for (const e of ledgerEntries) {
    if (e.type !== 'ADVANCE_APPLIED' && e.type !== 'OVERPAY_APPLIED') continue;
    if (normQuoteKey(e.quotationRef) !== idKey) continue;
    s += Math.round(Number(e.amountNgn) || 0);
  }
  return s;
}

function cashPaidOnQuotation(quotationId, receiptRows, ledgerEntries) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey) return 0;
  let s = sumAdvanceAppliedNgnForQuotation(ledgerEntries, quotationId);
  for (const r of receiptRows || []) {
    if (normQuoteKey(r.quotationRef) !== idKey) continue;
    if (String(r.status || '').toLowerCase() === 'reversed') continue;
    s += receiptCashReceivedNgn(r);
  }
  return s;
}

/** Paid fraction gate (branch setting): actual cash in, or book allocation, or manager override. */
export function meetsCuttingListPayThreshold(q, receiptRows, ledgerEntries, minPaidFraction = 0.7) {
  if (productionGateOverrideEffective(q)) return true;
  const total = Number(q?.totalNgn ?? q?.total_ngn) || 0;
  if (total <= 0) return false;
  const mf =
    Number.isFinite(minPaidFraction) && minPaidFraction >= 0.05 && minPaidFraction <= 1
      ? minPaidFraction
      : 0.7;
  const threshold = total * mf - 1e-6;
  const book = bookPaidTowardQuotation(q);
  const cash = cashPaidOnQuotation(q?.id, receiptRows, ledgerEntries);
  return cash >= threshold || book >= threshold;
}
