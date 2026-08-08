import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * Create-mode policy chips: executive approval threshold and MD pricing gate.
 * Copy is short; full policy remains enforced server-side / on submit.
 */
export function RefundCreatePolicyWarnings({
  amountNgn,
  executiveThresholdNgn,
  mdPricingBlocked,
  quotationRef,
}) {
  const amount = Math.round(Number(amountNgn) || 0);
  const threshold = Math.round(Number(executiveThresholdNgn) || 0);
  const exceedsExecutive = threshold > 0 && amount > threshold;

  if (!exceedsExecutive && !mdPricingBlocked) return null;

  return (
    <div className="flex flex-wrap gap-2" role="status">
      {exceedsExecutive ? (
        <div
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-ui-xs font-semibold text-violet-950"
          title={`Requested ₦${amount.toLocaleString('en-NG')} exceeds branch threshold ₦${threshold.toLocaleString('en-NG')}. Expect MD/executive review before payout.`}
        >
          <ShieldAlert size={14} className="text-violet-700 shrink-0" aria-hidden />
          Executive review (₦{amount.toLocaleString('en-NG')})
        </div>
      ) : null}
      {mdPricingBlocked ? (
        <div
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-ui-xs font-semibold text-amber-950"
          role="alert"
          title={`Quotation ${quotationRef || '—'} has below-floor pricing pending MD sign-off. Refund approval stays blocked until MD confirms.`}
        >
          <AlertTriangle size={14} className="text-amber-800 shrink-0" aria-hidden />
          MD pricing pending
        </div>
      ) : null}
    </div>
  );
}
