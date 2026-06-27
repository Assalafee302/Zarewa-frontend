/** Kg consumed on one production allocation row (booked consumed weight preferred). */
export function resolveCoilJobKgUsed(row) {
  if (!row || typeof row !== 'object') return null;
  const consumed = Number(row.consumedWeightKg ?? row.consumed_weight_kg);
  if (Number.isFinite(consumed) && consumed > 0) return consumed;
  const opening = Number(row.openingWeightKg ?? row.opening_weight_kg);
  const closing = Number(row.closingWeightKg ?? row.closing_weight_kg);
  if (Number.isFinite(opening) && opening > 0 && Number.isFinite(closing) && closing >= 0 && opening >= closing) {
    return opening - closing;
  }
  return null;
}

function openingClosingKg(row) {
  const opening = Number(row?.openingWeightKg ?? row?.opening_weight_kg);
  const closing = Number(row?.closingWeightKg ?? row?.closing_weight_kg);
  if (!Number.isFinite(opening) || opening <= 0) return null;
  if (!Number.isFinite(closing) || closing < 0 || closing > opening) return null;
  return opening - closing;
}

/**
 * Merge server holders / snapshot coil rows with production job + conversion check metadata.
 */
export function buildCoilProfileJobRows({
  holders = [],
  linkedJobs = [],
  productionJobs = [],
  checkByKey = new Map(),
  linkedCuttingSet = new Set(),
}) {
  const jobById = new Map();
  for (const j of productionJobs || []) {
    const id = String(j.jobID || j.job_id || '').trim();
    if (id) jobById.set(id, j);
  }

  const source = Array.isArray(holders) && holders.length > 0 ? holders : linkedJobs || [];

  return source.map((r) => {
    const keyJob = String(r.jobID || r.job_id || '').trim();
    const keyCl = String(r.cuttingListId || r.cutting_list_id || '').trim();
    const check = checkByKey.get(keyJob) || checkByKey.get(keyCl) || null;
    const jobMeta = keyJob ? jobById.get(keyJob) : null;
    const cuttingListId =
      keyCl || String(jobMeta?.cuttingListId || jobMeta?.cutting_list_id || check?.cuttingListId || '').trim();
    const jobStatus = String(
      r.jobStatus || r.status || jobMeta?.status || jobMeta?.jobStatus || ''
    ).trim();
    const kgUsed = resolveCoilJobKgUsed(r);
    const meters = Number(r.metersProduced ?? r.meters_produced);
    const metersN = Number.isFinite(meters) ? meters : 0;
    const derivedConv = kgUsed != null && metersN > 0 ? kgUsed / metersN : null;

    return {
      ...r,
      cuttingListId,
      jobStatus,
      kgUsed,
      meters: metersN,
      actualConv: check?.actualConversionKgPerM ?? derivedConv,
      standardConv: check?.standardConversionKgPerM ?? null,
      supplierConv: check?.supplierConversionKgPerM ?? null,
      alertState:
        String(r.conversionAlertState || r.alertState || check?.alertState || jobMeta?.conversionAlertState || '').trim(),
      status:
        jobStatus ||
        (linkedCuttingSet.has(keyCl) || (cuttingListId && linkedCuttingSet.has(cuttingListId)) ? 'Linked' : ''),
    };
  });
}

/** Compare summed job consumption against coil book used kg. */
export function coilProfileProductionTotals(jobRows, bookUsedKg) {
  let jobsConsumedKgSum = 0;
  let openingClosingKgSum = 0;
  for (const row of jobRows || []) {
    const used = resolveCoilJobKgUsed(row);
    if (used != null) jobsConsumedKgSum += used;
    const oc = openingClosingKg(row);
    if (oc != null) openingClosingKgSum += oc;
  }
  const book = Number(bookUsedKg);
  const gapKg = Number.isFinite(book) ? jobsConsumedKgSum - book : null;
  const openingClosingGapKg =
    Number.isFinite(book) && openingClosingKgSum > 0 ? openingClosingKgSum - book : null;
  return { jobsConsumedKgSum, openingClosingKgSum, gapKg, openingClosingGapKg };
}
