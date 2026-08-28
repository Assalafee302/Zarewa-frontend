import { amountDueOnQuotationFromEntries } from '../shared/lib/customerLedgerCore.js';
import {
  planRefundCreditApplyAmount,
  refundCreditOpenAmountFromStoredRefund,
  refundIsEligibleCreditSourceKind,
} from '../shared/lib/refundCreditApply.js';

/** Ledger/API source id for a stored refund row. */
export function refundCreditSourceId(refundId) {
  return `refund:${String(refundId || '').trim()}`;
}

function normalizeRefundRow(refund) {
  if (!refund || typeof refund !== 'object') return {};
  return {
    status: refund.status,
    reason_category: refund.reason_category ?? refund.reasonCategory,
    reasonCategory: refund.reasonCategory ?? refund.reason_category,
    calculation_lines_json:
      typeof refund.calculation_lines_json === 'string'
        ? refund.calculation_lines_json
        : undefined,
    calculationLines: refund.calculationLines,
    amount_ngn: refund.amount_ngn ?? refund.amountNgn,
    amountNgn: refund.amountNgn ?? refund.amount_ngn,
    approved_amount_ngn: refund.approved_amount_ngn ?? refund.approvedAmountNgn,
    approvedAmountNgn: refund.approvedAmountNgn ?? refund.approved_amount_ngn,
    paid_amount_ngn: refund.paid_amount_ngn ?? refund.paidAmountNgn,
    paidAmountNgn: refund.paidAmountNgn ?? refund.paid_amount_ngn,
    credit_applied_ngn: refund.credit_applied_ngn ?? refund.creditAppliedNgn,
    creditAppliedNgn: refund.creditAppliedNgn ?? refund.credit_applied_ngn,
    split_distributions_json:
      typeof refund.split_distributions_json === 'string'
        ? refund.split_distributions_json
        : undefined,
    splitDistributions: refund.splitDistributions ?? refund.refundSplits,
  };
}

/** Open transferable credit on this refund (matches cashier eligible API). */
export function refundTransferableOpenNgn(refund) {
  return refundCreditOpenAmountFromStoredRefund(normalizeRefundRow(refund));
}

/** Whether category/status allow credit apply (ignores open balance). */
export function refundMayApplyCreditToQuotation(refund) {
  if (!refund) return false;
  const status = String(refund.status || '').trim();
  if (status === 'Paid' || status === 'Rejected' || status === 'Cancelled') return false;
  const row = normalizeRefundRow(refund);
  return refundIsEligibleCreditSourceKind({
    status,
    reasonCategory: row.reasonCategory,
    calculationLines: row.calculationLines,
  });
}

/**
 * Same-customer quotations with balance due — candidate targets for refund fund apply.
 * @param {object[]} quotations
 * @param {string} customerId
 * @param {{ excludeQuotationRef?: string }} [opts]
 */
export function listCustomerQuotationsWithBalanceDue(quotations, customerId, opts = {}) {
  const cid = String(customerId || '').trim();
  if (!cid) return [];
  const exclude = String(opts.excludeQuotationRef || '').trim();
  return (quotations || [])
    .map((q) => {
      const id = String(q?.id || '').trim();
      if (!id) return null;
      if (String(q.customerID || q.customer_id || '').trim() !== cid) return null;
      const dueNgn = amountDueOnQuotationFromEntries(null, q);
      if (!(dueNgn > 0)) return null;
      if (exclude && id === exclude) return null;
      return {
        id,
        customer: String(q.customer || q.customerName || q.customer_name || '').trim(),
        totalNgn: Math.round(Number(q.totalNgn ?? q.total_ngn) || 0),
        paidNgn: Math.round(Number(q.paidNgn ?? q.paid_ngn) || 0),
        dueNgn: Math.round(dueNgn),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.dueNgn - a.dueNgn || a.id.localeCompare(b.id));
}

/**
 * Plan apply amount for one refund source against eligible API payload.
 * @param {object} eligiblePayload response from refund-credit-eligible
 * @param {string} refundId
 */
export function planApplyFromRefundSource(eligiblePayload, refundId) {
  const sourceId = refundCreditSourceId(refundId);
  const sources = Array.isArray(eligiblePayload?.sources) ? eligiblePayload.sources : [];
  const src = sources.find((s) => String(s.id || '') === sourceId);
  if (!src) {
    const unavailable = Array.isArray(eligiblePayload?.unavailableSources)
      ? eligiblePayload.unavailableSources.find(
          (s) => String(s.refundId || '') === String(refundId || '').trim()
        )
      : null;
    return {
      ok: false,
      applyNgn: 0,
      error: unavailable?.reason || 'This refund has no transferable balance for that quotation.',
    };
  }
  const avail = Math.max(0, Math.round(Number(src.availableNgn) || 0));
  const due = Math.max(0, Math.round(Number(eligiblePayload?.targetDueNgn) || 0));
  const plan = planRefundCreditApplyAmount({
    targetDueNgn: due,
    availableNgn: avail,
    requestedNgn: null,
  });
  return {
    ok: plan.ok,
    applyNgn: plan.applyNgn,
    source: src,
    targetDueNgn: due,
    remainderDueNgn: plan.remainderDueNgn,
    leftoverOnRefundNgn: Math.max(0, avail - plan.applyNgn),
    error: plan.error,
  };
}
