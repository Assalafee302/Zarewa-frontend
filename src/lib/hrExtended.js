import { apiFetch, apiUrl } from './apiBase';

export function fetchHrLetters(userId) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiFetch(`/api/hr/employment-letters${q}`);
}

export function generateHrLetter(body) {
  return apiFetch('/api/hr/employment-letters/generate', { method: 'POST', body: JSON.stringify(body) });
}

/** @param {string} letterId */
export async function downloadEmploymentLetterPdf(letterId) {
  const r = await fetch(apiUrl(`/api/hr/employment-letters/${encodeURIComponent(letterId)}/pdf`), {
    credentials: 'include',
  });
  if (!r.ok) return { ok: false, error: 'PDF download failed.' };
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || `letter-${letterId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export function fetchHrBeneficiaries(mine = false) {
  const q = mine ? '?mine=1' : '';
  return apiFetch(`/api/hr/beneficiaries${q}`);
}

export function saveHrBeneficiary(body) {
  return apiFetch('/api/hr/beneficiaries', { method: 'PUT', body: JSON.stringify(body) });
}

export function fetchHrBenefitPayments(periodYyyymm) {
  return apiFetch(`/api/hr/benefit-payments?periodYyyymm=${encodeURIComponent(periodYyyymm)}`);
}

export function recordHrBenefitPayment(body) {
  return apiFetch('/api/hr/benefit-payments', { method: 'POST', body: JSON.stringify(body) });
}

export function fetchHrIncidentMemos() {
  return apiFetch('/api/hr/incident-memos');
}

export function createHrIncidentMemo(body) {
  return apiFetch('/api/hr/incident-memos', { method: 'POST', body: JSON.stringify(body) });
}

export function escalateHrIncident(memoId, body) {
  return apiFetch(`/api/hr/incident-memos/${encodeURIComponent(memoId)}/escalate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchHrTransferRecommendations() {
  return apiFetch('/api/hr/transfer-recommendations');
}

export function createHrTransferRecommendation(body) {
  return apiFetch('/api/hr/transfer-recommendations', { method: 'POST', body: JSON.stringify(body) });
}

export function reviewHrTransferRecommendation(id, body) {
  return apiFetch(`/api/hr/transfer-recommendations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchHrLeaveCalendar(fromIso, toIso) {
  const q = new URLSearchParams({ from: fromIso, to: toIso });
  return apiFetch(`/api/hr/leave/calendar?${q}`);
}

export function fetchExceptionalLoanQueue() {
  return apiFetch('/api/hr/loans/exceptional-queue');
}

export function fetchHrReportsSummary() {
  return apiFetch('/api/hr/reports/summary');
}

export function fetchRecentSalaryChanges(limit = 30) {
  return apiFetch(`/api/hr/salary-changes/recent?limit=${limit}`);
}

export function fetchDraftPayrollRuns() {
  return apiFetch('/api/hr/payroll-runs/drafts');
}

export function recomputePayrollRun(runId) {
  return apiFetch(`/api/hr/payroll-runs/${encodeURIComponent(runId)}/recompute`, { method: 'POST' });
}

export function fetchHrPolicyRequirements() {
  return apiFetch('/api/hr/policy-requirements');
}

export function acceptHrPolicy(body) {
  return apiFetch('/api/hr/policy-acknowledgements', { method: 'POST', body: JSON.stringify(body) });
}
