import React from 'react';
import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../../shared/refundConstants.js';

/** Rich eligibility copy for the refund guide panel (single source). */
export function RefundEligibilitySummary() {
  const floor = MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
  return (
    <p className="text-xs leading-relaxed text-teal-800/85 font-medium">
      Listed quotes are <strong className="text-teal-950">fully paid</strong> (≥99.5% of order total when a total
      exists), have at least <strong className="text-teal-950">₦{floor}</strong> refundable headroom and automatic
      preview total, and production <strong className="text-teal-950">completed</strong> or{' '}
      <strong className="text-teal-950">cancelled</strong> (or <strong className="text-teal-950">void</strong> with
      payment). Selecting a quotation loads the full refund preview (amounts, categories, production checks). Additional
      refunds on the same quotation are allowed for a <strong className="text-teal-950">different category</strong> when
      headroom remains. Paste a quotation id with <strong className="text-teal-950">Use quotation id</strong> if it is
      missing from the list.
    </p>
  );
}
