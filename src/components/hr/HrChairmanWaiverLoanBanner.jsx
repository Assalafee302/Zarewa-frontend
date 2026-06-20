import React from 'react';
import { canChairmanWaiveObligation, loanRequestNeedsChairmanWaiver } from '../../lib/hrAccess';

/**
 * Shown on GM HR review for loans flagged needsChairmanWaiver.
 */
export function HrChairmanWaiverLoanBanner({ request, permissions, roleKey }) {
  if (!loanRequestNeedsChairmanWaiver(request) || String(request?.status || '') !== 'gm_hr_review') {
    return null;
  }
  const mayApprove = canChairmanWaiveObligation(permissions, roleKey);
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        mayApprove
          ? 'border-violet-200 bg-violet-50 text-violet-950'
          : 'border-amber-300 bg-amber-50 text-amber-950'
      }`}
    >
      <p className="font-bold">Chairman waiver required</p>
      <p className="mt-1">
        {mayApprove
          ? 'You may give final approval — this loan was flagged for Chairman / board policy waiver.'
          : 'Final approval is blocked until Chairman or MD reviews this loan. GM HR cannot approve alone.'}
      </p>
    </div>
  );
}
