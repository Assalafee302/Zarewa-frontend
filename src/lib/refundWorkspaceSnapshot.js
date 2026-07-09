/** Stable key for jobs on a quotation — when this changes, refund preview should re-run from the server. */
export function productionJobsFingerprintForQuotation(productionJobs, quotationRef) {
  const ref = String(quotationRef || '').trim();
  if (!ref) return '';
  return (productionJobs || [])
    .filter((j) => String(j.quotationRef || '').trim() === ref)
    .map((j) =>
      [
        String(j.jobID || '').trim(),
        String(j.status || '').trim().toLowerCase(),
        Math.round(Number(j.actualMeters) || 0),
        Math.round(Number(j.effectiveOutputMeters ?? j.actualMeters) || 0),
        String(j.productID || '').trim(),
        String(j.conversionAlertState || '').trim(),
        j.coilSpecMismatchPending ? '1' : '0',
      ].join('|')
    )
    .sort()
    .join('~');
}

/** Workspace accessory issue rows for this quote — when these change, refund preview + intelligence should refresh. */
export function accessoryUsageFingerprintForQuotation(productionJobAccessoryUsage, quotationRef) {
  const ref = String(quotationRef || '').trim();
  if (!ref) return '';
  return (productionJobAccessoryUsage || [])
    .filter((u) => String(u.quotationRef || u.quotation_ref || '').trim() === ref)
    .map((u) =>
      [
        String(u.jobID || u.job_id || '').trim(),
        String(u.quoteLineId || u.quote_line_id || '').trim(),
        Math.round(Number(u.suppliedQty ?? u.supplied_qty) || 0),
        String(u.name || '')
          .trim()
          .toLowerCase(),
      ].join('|')
    )
    .sort()
    .join('~');
}

export function refundWorkspaceSnapshotFingerprint(productionJobs, productionJobAccessoryUsage, quotationRef) {
  const j = productionJobsFingerprintForQuotation(productionJobs, quotationRef);
  const a = accessoryUsageFingerprintForQuotation(productionJobAccessoryUsage, quotationRef);
  return `${j}##${a}`;
}
