/**
 * How to use hanging / pending refund money — display only, never hide the row.
 */
import { refundCategoriesAreOverpaymentOnly } from '../shared/lib/refundCreditApply.js';
import { hangingRefundOpenAmountNgn, refundLooksPaidWithoutTillPayout } from './refundsStore.js';

function roundNgn(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

export function hangingRefundHowToUse(r) {
  if (!r) return '';
  const overpay =
    r.overpaymentOnly === true ||
    refundCategoriesAreOverpaymentOnly(r.reasonCategory, r.calculationLines);
  const asRefund = {
    ...r,
    refundID: r.refundID || r.refundId,
    paidAtISO: r.paidAtISO ?? r.paid_at_iso,
    paidBy: r.paidBy ?? r.paid_by,
    amountNgn: r.amountNgn ?? r.availableNgn,
    paidAmountNgn: r.paidAmountNgn,
    status: r.status,
  };
  if (refundLooksPaidWithoutTillPayout(asRefund)) {
    return overpay
      ? 'Still open. Tick this refund to cover a new receipt (not extra bank cash), or View it to pay staff/customer from till after holds clear.'
      : 'Still open. View the refund — Paid with no payout date usually means approval settlement, not cash out.';
  }
  const status = String(r.status || '').trim();
  if (status === 'Pending') {
    return overpay
      ? 'Pending overpayment can cover this receipt now (no BM needed). Till payout waits for manager approval.'
      : 'Waiting on manager approval. Cannot cover a receipt or till-pay until Approved.';
  }
  if (status === 'Approved' || status === 'Partially paid') {
    return overpay
      ? 'Tick this refund to cover a receipt line. Or pay remaining net from till. Do not do both for the same ₦.'
      : 'Pay remaining from till, or apply leftover as credit on a receipt if eligible.';
  }
  return 'Keep this visible until cash is paid, credit is applied, or the refund is rejected.';
}

export function ledgerOverpayHowToUse() {
  return 'Overpayment on that job — no refund request needed. Tick to cover this receipt instead of confirming the same ₦ as new bank cash.';
}

export function unavailableRefundHowToUse(source) {
  const reason = String(source?.reason || '').trim();
  const status = String(source?.status || '').trim();
  if (refundLooksPaidWithoutTillPayout(source) || /no till payout/i.test(reason)) {
    return hangingRefundHowToUse(source);
  }
  if (status === 'Pending' && !source?.overpaymentOnly) {
    return 'Wait for manager approval, then this refund can cover a receipt or be paid from till.';
  }
  if (/company cut/i.test(reason) || /already used/i.test(reason)) {
    return 'If this is an overpayment still sitting on a new receipt line, View the refund — do not hide it. Repair may restore credit/till net.';
  }
  if (/transport|install/i.test(reason)) {
    return 'Cash payout only — pay from till when due. Cannot cover another receipt.';
  }
  return reason || 'Still on file — open the refund record to see till vs credit.';
}

/**
 * When a receipt split equals a hanging refund amount, tell cashier it may be referral not new cash.
 */
export function receiptLineHangingRefundHint(amountNgn, hangingRefunds) {
  const amt = roundNgn(amountNgn);
  if (!(amt > 0) || !Array.isArray(hangingRefunds)) return '';
  const match = hangingRefunds.find((r) => {
    const open = hangingRefundOpenAmountNgn(r);
    const requested = roundNgn(r?.amountNgn);
    return open === amt || requested === amt;
  });
  if (!match) return '';
  const rid = String(match.refundID || '').trim() || 'refund';
  const q = String(match.quotationRef || '').trim();
  return `This line is the same ₦ as hanging ${rid}${q ? ` (${q})` : ''}. Tick that refund above to cover this line — do not confirm it as new bank cash unless the bank really received a second deposit.`;
}
