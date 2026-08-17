/**
 * Cutting-list / production payment threshold — mirror of
 * Zarewa-backend-main/shared/lib/cuttingListPaymentGate.js
 */

import { receiptCashReceivedNgn } from './salesReceiptsList';
import { productionGateOverrideEffective } from './productionGateAccess';

function normQuoteKey(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

/** @param {number} totalNgn @param {number | null | undefined} paymentGateBasisTotalNgn @param {boolean} [hasBelowFloorViolations] */
export function cuttingListPaymentThresholdTotalNgn(
  totalNgn,
  paymentGateBasisTotalNgn,
  hasBelowFloorViolations = false
) {
  const total = Math.round(Number(totalNgn) || 0);
  if (total <= 0) return 0;
  if (hasBelowFloorViolations) return total;
  const basis = Math.round(Number(paymentGateBasisTotalNgn) || 0);
  if (basis > 0 && total > basis) return basis;
  return total;
}

export function meetsCuttingListPaymentGate(
  q,
  cashPaidNgn,
  minPaidFraction = 0.7,
  hasBelowFloorViolations = false
) {
  if (productionGateOverrideEffective(q)) return true;
  const total = Number(q?.totalNgn ?? q?.total_ngn) || 0;
  if (total <= 0) return false;
  const mf =
    Number.isFinite(minPaidFraction) && minPaidFraction >= 0.05 && minPaidFraction <= 1
      ? minPaidFraction
      : 0.7;
  const basis = Number(q?.paymentGateBasisTotalNgn ?? q?.payment_gate_basis_total_ngn) || 0;
  const thresholdTotal = cuttingListPaymentThresholdTotalNgn(total, basis, hasBelowFloorViolations);
  const threshold = thresholdTotal * mf - 1e-6;
  const book = Math.max(0, Math.round(Number(q?.paidNgn ?? q?.paid_ngn) || 0));
  const cash = Math.max(0, Math.round(Number(cashPaidNgn) || 0));
  return cash >= threshold || book >= threshold;
}

export function cuttingListMinPaidFractionFromSession(session) {
  const bid = String(session?.currentBranchId || '').trim();
  const branches = Array.isArray(session?.branches) ? session.branches : [];
  const row = branches.find((b) => String(b.id) === bid);
  const f = Number(row?.cuttingListMinPaidFraction);
  if (Number.isFinite(f) && f >= 0.05 && f <= 1) return f;
  return 0.7;
}

export function bookPaidTowardQuotation(q) {
  return Math.max(0, Number(q?.paidNgn ?? q?.paid_ngn) || 0);
}

export function sumAdvanceAppliedNgnForQuotation(ledgerEntries, quotationId) {
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

/** Receipt till cash only (excludes ledger advance/overpay applications). */
export function receiptTillCashOnlyOnQuotation(quotationId, receiptRows) {
  const idKey = normQuoteKey(quotationId);
  if (!idKey) return 0;
  let s = 0;
  for (const r of receiptRows || []) {
    if (normQuoteKey(r.quotationRef) !== idKey) continue;
    if (String(r.status || '').toLowerCase() === 'reversed') continue;
    s += receiptCashReceivedNgn(r);
  }
  return s;
}

/** Paid fraction gate: cash, book allocation, manager override, or list-price roll-forward basis. */
export function meetsCuttingListPayThreshold(
  q,
  receiptRows,
  ledgerEntries,
  minPaidFraction = 0.7,
  hasBelowFloorViolations = false
) {
  if (productionGateOverrideEffective(q)) return true;
  const cash = cashPaidOnQuotation(q?.id, receiptRows, ledgerEntries);
  return meetsCuttingListPaymentGate(q, cash, minPaidFraction, hasBelowFloorViolations);
}
