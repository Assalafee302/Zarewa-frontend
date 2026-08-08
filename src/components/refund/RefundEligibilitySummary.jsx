import React from 'react';
import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../../shared/refundConstants.js';

/** Compact eligibility copy for the refund help panel. */
export function RefundEligibilitySummary() {
  const floor = MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
  return (
    <p className="text-xs leading-snug text-teal-800/85 font-medium">
      Fully paid quotes with ≥ ₦{floor} refundable headroom and finished (or cancelled/void) production.
      Paste a missing id with <strong className="text-teal-950">Use quotation id</strong>.
    </p>
  );
}
