import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * Create-mode policy banners: executive approval threshold and MD pricing gate.
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
    <div className="space-y-3" role="status">
      {exceedsExecutive ? (
        <div className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <ShieldAlert size={18} className="text-violet-700 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-violet-950">
            <p className="font-bold">Executive approval tier</p>
            <p className="mt-0.5 font-medium">
              Requested ₦{amount.toLocaleString('en-NG')} exceeds the branch threshold of ₦
              {threshold.toLocaleString('en-NG')}. You can still submit — expect Managing Director or executive review
              before payout.
            </p>
          </div>
        </div>
      ) : null}
      {mdPricingBlocked ? (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3" role="alert">
          <AlertTriangle size={18} className="text-amber-800 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-amber-950">
            <p className="font-bold">MD pricing confirmation required</p>
            <p className="mt-0.5 font-medium">
              Quotation {quotationRef || '—'} has below-floor pricing pending Managing Director sign-off after
              production. Refund approval will be blocked until MD confirms pricing — coordinate with management before
              promising payout timing to the customer.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
