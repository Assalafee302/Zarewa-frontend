import { effectiveOutstandingNgn } from './paymentOutstandingTolerance.js';

/** @param {object | null | undefined} settlement */
export function registerSettlementOutstandingNgn(settlement) {
  const approved = Math.round(Number(settlement?.approvedAmountNgn ?? settlement?.amountNgn) || 0);
  const paid = Math.round(Number(settlement?.paidAmountNgn) || 0);
  return effectiveOutstandingNgn(approved, paid);
}

/** @param {object[] | null | undefined} items */
export function registerSettlementsAwaitingPayment(items) {
  return (items || []).filter((s) => {
    if (String(s?.status || '') !== 'Approved') return false;
    return registerSettlementOutstandingNgn(s) > 0;
  });
}
