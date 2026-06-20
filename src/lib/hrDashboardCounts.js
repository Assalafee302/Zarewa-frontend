import { apiFetch } from './apiBase';

/** Parse inbox queue counts from `/api/hr/dashboard`. */
export function parseHrDashboardCounts(data) {
  const summary = data?.observability?.summary || {};
  const inbox = data?.inbox?.counts || {};
  return {
    pendingHrReview: Number(inbox.pendingHrReview ?? summary.pendingHrReview) || 0,
    pendingBranchEndorse: Number(inbox.pendingBranchEndorse ?? summary.pendingBranchEndorse) || 0,
    pendingGmHrReview: Number(inbox.pendingGmHrReview ?? summary.pendingGmHrReview) || 0,
    overdueRequests: Number(inbox.overdueRequests ?? summary.overdueRequests) || 0,
    incompleteProfiles: Number(inbox.incompleteProfiles ?? summary.incompleteProfiles) || 0,
    draftPayrollRuns: Number(inbox.draftPayrollRuns) || 0,
    draftPayrollAwaitingGm: Number(inbox.draftPayrollAwaitingGm) || 0,
    primaryDraftPayrollRunId: inbox.primaryDraftPayrollRunId || null,
    primaryDraftPayrollAwaitingGmRunId: inbox.primaryDraftPayrollAwaitingGmRunId || null,
  };
}

export async function fetchHrDashboardCounts() {
  const { ok, data } = await apiFetch('/api/hr/dashboard');
  if (!ok || !data?.ok) {
    return { ok: false, counts: parseHrDashboardCounts({}), error: data?.error || 'Could not load HR counts.' };
  }
  return { ok: true, counts: parseHrDashboardCounts(data) };
}

/** Map approval queue scope → dashboard count field. */
export const HR_REQUEST_SCOPE_COUNT_KEY = {
  hr_queue: 'pendingHrReview',
  endorse_queue: 'pendingBranchEndorse',
  gm_queue: 'pendingGmHrReview',
};
