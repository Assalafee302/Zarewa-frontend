import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../shared/refundConstants.js';

function floorLabel() {
  return MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
}

/** Plain-text eligibility rules for tooltips / aria. */
export function refundQuotationEligibilityPlainText() {
  const floor = floorLabel();
  return `Fully paid (≥99.5%), more than ₦${floor} refundable headroom, production completed or cancelled (or void with payment). Full preview loads when you select a quote.`;
}

export function refundEmptyPickerHintText() {
  const floor = floorLabel();
  return `Refunds list quotations that are fully paid (≥99.5% of total when total is set), have more than ₦${floor} refundable headroom, and production completed or cancelled (or void with payment). A second refund on the same quote is allowed for a different category when headroom remains. If you already posted a receipt but the quote is missing here, the payment may have been recorded under a different branch — use sync to recalculate from the ledger, or enter the quotation id with Use quotation id.`;
}
