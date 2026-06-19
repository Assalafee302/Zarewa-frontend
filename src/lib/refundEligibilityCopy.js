import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../shared/refundConstants.js';

function floorLabel() {
  return MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
}

/** Plain-text eligibility rules for tooltips / aria. */
export function refundQuotationEligibilityPlainText() {
  const floor = floorLabel();
  return `Fully paid (≥99.5%), more than ₦${floor} refundable headroom, production completed or cancelled (or void with payment), automatic preview at least ₦${floor}. Use quotation id for manual verify when preview is below floor.`;
}

export function refundEmptyPickerHintText() {
  const floor = floorLabel();
  return `Refunds only list quotations that are fully paid (≥99.5% of total when total is set), have more than ₦${floor} refundable headroom, production completed or cancelled (or void with payment), and an automatic preview total at least ₦${floor}. A second refund on the same quote is allowed for a different category when headroom remains. If you already posted a receipt but the quote is missing here, the payment may have been recorded under a different branch than the quotation — use sync to recalculate from the ledger. If the sale is eligible but excluded because the automatic preview is below that amount, use Use quotation id after entering the full quotation reference.`;
}
