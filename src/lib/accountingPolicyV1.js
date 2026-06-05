/**
 * Accounting Policy v1 — client labels (mirrors shared/lib/accountingPolicyV1.js).
 */
import {
  amountDueOnQuotationFromEntries,
  quotationHasCompletedProduction,
  receivableDueOnQuotationFromEntries,
} from './customerLedgerCore.js';
import { isEffectivelyFullyPaid } from './paymentOutstandingTolerance.js';

export function quotationPaymentPolicyPhase(quotationRef, productionJobs = []) {
  return quotationHasCompletedProduction(quotationRef, productionJobs)
    ? 'post_production'
    : 'pre_production';
}

export function quotationPaymentPolicySnapshot(q, productionJobs = []) {
  const id = String(q?.id || '').trim();
  const phase = quotationPaymentPolicyPhase(id, productionJobs);
  const totalNgn = Math.round(Number(q?.totalNgn) || 0);
  const paidNgn = Math.round(Number(q?.paidNgn) || 0);
  const legacyAmountDueNgn = amountDueOnQuotationFromEntries(null, q);
  const receivableNgn = receivableDueOnQuotationFromEntries(null, q, productionJobs);

  if (phase === 'pre_production') {
    const balanceLabel = isEffectivelyFullyPaid(paidNgn, totalNgn)
      ? 'deposit_settled'
      : legacyAmountDueNgn > 0
        ? 'deposit_pending'
        : 'no_balance';
    return {
      policyPhase: phase,
      totalNgn,
      paidNgn,
      depositOnAccountNgn: paidNgn,
      depositPendingNgn: legacyAmountDueNgn,
      receivableNgn: 0,
      amountDueNgn: legacyAmountDueNgn,
      balanceLabel,
    };
  }

  const balanceLabel = receivableNgn > 0 ? 'receivable' : 'settled';
  return {
    policyPhase: phase,
    totalNgn,
    paidNgn,
    depositOnAccountNgn: 0,
    depositPendingNgn: 0,
    receivableNgn,
    amountDueNgn: receivableNgn,
    balanceLabel,
  };
}

export function policyBalanceLabelText(balanceLabel) {
  switch (balanceLabel) {
    case 'deposit_settled':
      return 'Deposit on account (settled)';
    case 'deposit_pending':
      return 'Deposit pending';
    case 'receivable':
      return 'Receivable';
    case 'settled':
      return 'Settled';
    case 'no_balance':
      return 'No balance';
    default:
      return 'Balance';
  }
}
