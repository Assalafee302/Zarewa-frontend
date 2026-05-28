/** HR request API action paths by queue step. */
export function hrRequestReviewPath(requestId, status) {
  const id = encodeURIComponent(requestId);
  if (status === 'hr_review') return `/api/hr/requests/${id}/hr-review`;
  if (status === 'branch_manager_review') return `/api/hr/requests/${id}/branch-endorse`;
  if (status === 'gm_hr_review') return `/api/hr/requests/${id}/gm-hr-review`;
  return null;
}

export function daysBetweenIso(startIso, endIso) {
  const s = String(startIso || '').slice(0, 10);
  const e = String(endIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return null;
  const a = new Date(`${s}T12:00:00Z`).getTime();
  const b = new Date(`${e}T12:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

export function currentPeriodYyyymm() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
