/**
 * Canonical production job status for UI and ordering (API / DB may vary casing).
 * @param {unknown} status
 * @returns {string}
 */
export function normalizeJobStatus(status) {
  const t = String(status ?? '').trim();
  if (!t) return 'Planned';
  const key = t.toLowerCase();
  const map = {
    planned: 'Planned',
    running: 'Running',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[key] ?? t;
}

/**
 * Prefer an actionable production job for a cutting list.
 * If `productionRegisterRef` points at a finished or cancelled job, ignore it and pick the best
 * live match (Running → Planned → …) so the register opens on the job you can still edit.
 *
 * @param {string} cuttingListId
 * @param {Array<{ jobID?: string; cuttingListId?: string; status?: string }>} jobs
 * @param {Array<{ id?: string; productionRegisterRef?: string }> | null | undefined} cuttingLists
 * @returns {Record<string, unknown> | null}
 */
export function pickProductionJobForCuttingList(cuttingListId, jobs, cuttingLists) {
  const id = String(cuttingListId || '').trim();
  if (!id || !Array.isArray(jobs)) return null;
  const matches = jobs.filter((j) => String(j.cuttingListId || '').trim() === id);
  if (!matches.length) return null;
  const cl = Array.isArray(cuttingLists) ? cuttingLists.find((c) => String(c.id || '').trim() === id) : null;
  const ref = String(cl?.productionRegisterRef || '').trim();
  if (ref) {
    const byRef = matches.find((j) => j.jobID === ref);
    if (byRef) {
      const st = normalizeJobStatus(byRef.status);
      if (st !== 'Completed' && st !== 'Cancelled') return byRef;
    }
  }
  const rank = (s) => {
    const order = { Running: 0, Planned: 1, Completed: 2, Cancelled: 3 };
    return order[normalizeJobStatus(s)] ?? 50;
  };
  return [...matches].sort((a, b) => rank(a.status) - rank(b.status))[0];
}
