/**
 * Mirror of Zarewa-backend-main/shared/lib/quotationPriceException.js — keep in sync.
 */

export function quotationBmPriceExceptionApproved(q) {
  if (!q) return false;
  if (String(q.bmPriceExceptionApprovedAtISO || '').trim()) return true;
  if (String(q.mdPriceExceptionApprovedAtISO || '').trim()) return true;
  return false;
}

export function quotationFlaggedForMdPriceReview(q) {
  if (!q) return false;
  const flagged =
    q.priceExceptionMdReviewRequired === true ||
    q.priceExceptionMdReviewRequired === 1 ||
    String(q.priceExceptionMdReviewRequired || '') === '1';
  return flagged && String(q.bmPriceExceptionApprovedAtISO || '').trim().length > 0;
}

export function quotationMdPriceReviewConfirmed(q) {
  if (!q) return true;
  if (String(q.priceExceptionMdConfirmedAtISO || '').trim()) return true;
  if (!quotationFlaggedForMdPriceReview(q)) {
    if (String(q.mdPriceExceptionApprovedAtISO || '').trim()) return true;
    return true;
  }
  return false;
}

export function quotationRefundBlockedPendingMdPriceConfirm(q) {
  if (!quotationFlaggedForMdPriceReview(q)) return false;
  return !quotationMdPriceReviewConfirmed(q);
}
