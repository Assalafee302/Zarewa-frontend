/**
 * Mirror of Zarewa-backend-main/shared/lib/quotationPriceException.js — keep in sync.
 */

export function quotationBelowFloorExceptionApproved(q) {
  if (!q) return false;
  if (String(q.mdPriceExceptionApprovedAtISO || '').trim()) return true;
  if (String(q.priceExceptionMdConfirmedAtISO || '').trim()) return true;
  return false;
}

/** @deprecated Use {@link quotationBelowFloorExceptionApproved} */
export function quotationBmPriceExceptionApproved(q) {
  return quotationBelowFloorExceptionApproved(q);
}

export function quotationBelowFloorPendingMdApproval(q) {
  if (!q) return false;
  const flagged =
    q.priceExceptionMdReviewRequired === true ||
    q.priceExceptionMdReviewRequired === 1 ||
    String(q.priceExceptionMdReviewRequired || '') === '1';
  if (!flagged) return false;
  return !quotationBelowFloorExceptionApproved(q);
}

/** @deprecated Use {@link quotationBelowFloorPendingMdApproval} */
export function quotationFlaggedForMdPriceReview(q) {
  return quotationBelowFloorPendingMdApproval(q);
}

/** @deprecated Use {@link quotationBelowFloorExceptionApproved} */
export function quotationMdPriceReviewConfirmed(q) {
  return quotationBelowFloorExceptionApproved(q);
}

export function quotationRefundBlockedPendingMdPriceConfirm(q) {
  return quotationBelowFloorPendingMdApproval(q);
}
