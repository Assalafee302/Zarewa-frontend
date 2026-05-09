/**
 * Refund quotation picklist / “potential refunds” gate: production must be closed out
 * (completed or explicitly cancelled) or the quote voided with payment on file.
 */

export function productionJobStatusClosesRefundEligibility(status) {
  const s = String(status || '').trim();
  return s === 'Completed' || s === 'Cancelled';
}

/** Paid quotation voided at sales (e.g. order cancelled) — eligible even with no production job row. */
export function quotationVoidPaidRefundEligible(q) {
  if (!q) return false;
  if (String(q.status ?? '').trim() !== 'Void') return false;
  return (Number(q.paidNgn ?? q.paid_ngn) || 0) > 0;
}

/**
 * Refund create picker: only list orders with nothing left for the customer to pay (paid ≥ total).
 * If order total is missing or zero, do not exclude (legacy / header not set).
 */
export function quotationOrderFullySettledForRefundPicker(paidNgn, totalNgn) {
  const total = Math.round(Number(totalNgn) || 0);
  const paid = Math.round(Number(paidNgn) || 0);
  if (total <= 0) return true;
  return paid >= total;
}
