/**
 * Cashier desk flags → shared attention rules (same sentence wherever the flag shows).
 */
import { attentionDeepLink, explainAttentionItem } from '../shared/lib/attentionRules.js';

const s = (v) => String(v ?? '').trim();

function receiptDateIso(r) {
  return s(r?.dateISO || r?.date || r?.receivedAtISO).slice(0, 10);
}

/**
 * @param {object} receipt
 * @param {'receipt_no_bank_line' | 'receipt_under_investigation'} ruleId
 * @param {{ paidTo?: string }} [extra]
 */
export function receiptAttentionItem(receipt, ruleId, extra = {}) {
  const r = receipt || {};
  return {
    id: `${ruleId}:${s(r.id)}`,
    ruleId,
    receiptId: s(r.id),
    amountNgn: Math.round(Number(r.amountNgn) || 0),
    facts: {
      amountNgn: Math.round(Number(r.amountNgn) || 0),
      customer: s(r.customer || r.customerID),
      atIso: receiptDateIso(r),
      caseId: s(r.investigationCaseId),
      status: s(r.status),
      paidTo: s(extra.paidTo),
    },
  };
}

/** @param {object} receipt @param {'receipt_no_bank_line' | 'receipt_under_investigation'} ruleId */
export function receiptAttention(receipt, ruleId, extra = {}, ctx = {}) {
  return explainAttentionItem(receiptAttentionItem(receipt, ruleId, extra), ctx);
}

/** Cashier desk link that opens the receipt row on its problem. */
export function receiptAttentionLink(receipt, ruleId) {
  return attentionDeepLink(receiptAttentionItem(receipt, ruleId), 'cashier');
}

/**
 * Hanging-refund chip on a receipt row: the customer's open refunds (and unused overpay credit) as one sentence.
 * @param {ReturnType<typeof import('./refundsStore.js').hangingRefundIndicator> & { refunds?: object[] } | null} indicator
 * @param {string} customer
 * @param {(r: object) => number} openAmount hangingRefundOpenAmountNgn
 */
export function hangingRefundAttention(indicator, customer, openAmount, ctx = {}) {
  if (!indicator) return null;
  const refunds = (indicator.refunds || []).map((r) => ({
    refundId: s(r.refundID || r.refund_id) || '—',
    openNgn: Math.round(Number(openAmount?.(r)) || 0),
    status: s(r.status),
    approvedAtIso: s(r.approvalDate || r.approval_date),
  }));
  const creditNgn = Math.round(Number(indicator.overpayCreditNgn) || 0);
  if (refunds.length === 0) {
    return explainAttentionItem(
      { id: `overpay_credit:${customer}`, ruleId: 'overpay_credit_unused', facts: { amountNgn: creditNgn } },
      ctx
    );
  }
  return explainAttentionItem(
    { id: `open_refund:${customer}`, ruleId: 'customer_open_refund', facts: { customer, refunds, creditNgn } },
    ctx
  );
}
