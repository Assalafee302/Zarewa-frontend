import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../shared/refundConstants.js';

function floorLabel() {
  return MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
}

/** Plain-text eligibility rules for tooltips / aria. */
export function refundQuotationEligibilityPlainText() {
  const floor = floorLabel();
  return `Fully paid quotes with ≥ ₦${floor} refundable headroom and finished (or cancelled/void) production.`;
}

export function refundEmptyPickerHintText() {
  const floor = floorLabel();
  return `No eligible quotes. Need fully paid, ≥ ₦${floor} headroom, and finished production. Sync paid from ledger or use Use quotation id if missing.`;
}
