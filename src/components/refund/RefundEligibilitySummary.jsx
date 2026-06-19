import React from 'react';
import { MIN_REFUND_QUOTATION_REMAINING_NGN } from '../../shared/refundConstants.js';

/** Rich eligibility copy for the refund guide panel (single source). */
export function RefundEligibilitySummary() {
  const floor = MIN_REFUND_QUOTATION_REMAINING_NGN.toLocaleString('en-NG');
  return (
    <p className="text-xs leading-relaxed text-teal-800/85 font-medium">
      Listed quotes are <strong className="text-teal-950">fully paid</strong> (≥99.5% of order total when a total
      exists), have more than <strong className="text-teal-950">₦{floor} refundable</strong> headroom (cash received
      minus refunds on file), production <strong className="text-teal-950">completed</strong> or{' '}
      <strong className="text-teal-950">cancelled</strong> (or <strong className="text-teal-950">void</strong> with
      payment), and the server must produce an{' '}
      <strong className="text-teal-950">automatic preview total of at least ₦{floor}</strong>. Additional refunds on the
      same quotation are allowed for a <strong className="text-teal-950">different category</strong> when headroom
      remains. The dropdown shows <strong className="text-teal-950">all</strong> such matches (scroll). If a sale
      qualifies but the preview is below that floor (including ₦0), use{' '}
      <strong className="text-teal-950">Use quotation id</strong> — the server confirms eligibility; then enter amounts
      manually.
    </p>
  );
}
