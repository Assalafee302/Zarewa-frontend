import { refundApprovedAmount, refundOutstandingAmount } from './refundsStore';
import {
  overpaymentAlreadyRefundedNgn,
  quotationOverpaymentResidualNgn,
} from '../shared/lib/refundQuotationMoney.js';

/**
 * Cashier-facing split of a refund: requested vs applied onto another quote vs till payout.
 * Credit apply is not a treasury payout — leftover cash can still sit in the pay-out queue.
 */
export function refundCashierMoneyStory(refund) {
  const requestedNgn = Math.round(Number(refund?.amountNgn ?? refund?.amount_ngn) || 0);
  const appliedNgn = Math.round(Number(refund?.creditAppliedNgn ?? refund?.credit_applied_ngn) || 0);
  const appliedToQuote = String(
    refund?.creditAppliedToQuotationRef ?? refund?.credit_applied_to_quotation_ref ?? ''
  ).trim();
  const approvedNgn = refundApprovedAmount(refund);
  const paidNgn = Math.round(Number(refund?.paidAmountNgn ?? refund?.paid_amount_ngn) || 0);
  const cashDueNgn = refundOutstandingAmount(refund);
  return {
    requestedNgn,
    appliedNgn,
    appliedToQuote,
    approvedNgn,
    paidNgn,
    cashDueNgn,
  };
}

/**
 * Remaining overpayment on the quote after other refunds. 0 means do not pay more cash.
 */
export function refundCashierOverpayResidualNgn({
  cashInNgn,
  quoteTotalNgn,
  refunds,
  excludeRefundId,
} = {}) {
  return quotationOverpaymentResidualNgn({
    cashInNgn,
    quoteTotalNgn,
    overpaymentAlreadyRefundedNgn: overpaymentAlreadyRefundedNgn(refunds, excludeRefundId),
  });
}

export function refundCashierCustomerName(refund, quote) {
  const candidates = [
    refund?.customer,
    refund?.customerName,
    refund?.customer_name,
    quote?.customer,
    quote?.customerName,
    quote?.customer_name,
  ];
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (s && s !== '—') return s;
  }
  return '—';
}
