import { apiFetch } from './apiBase';

export function fetchHrAbsenceReports(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  return apiFetch(`/api/hr/absence-reports?${q}`);
}

export function createHrAbsenceReport(body) {
  return apiFetch('/api/hr/absence-reports', { method: 'POST', body: JSON.stringify(body) });
}

export function reviewHrAbsenceReport(id, body) {
  return apiFetch(`/api/hr/absence-reports/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function closeHrAbsenceReport(id, body) {
  return apiFetch(`/api/hr/absence-reports/${encodeURIComponent(id)}/close`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchHrAbsenceAlerts() {
  return apiFetch('/api/hr/absence-reports/alerts');
}

export function fetchHrExitClearance(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  return apiFetch(`/api/hr/exit-clearance?${q}`);
}

export function fetchHrExitClearanceOne(id) {
  return apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(id)}`);
}

export function createHrExitClearance(body) {
  return apiFetch('/api/hr/exit-clearance', { method: 'POST', body: JSON.stringify(body) });
}

export function patchHrExitPropertyItem(clearanceId, itemId, body) {
  return apiFetch(
    `/api/hr/exit-clearance/${encodeURIComponent(clearanceId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  );
}

export function financeClearHrExit(id, body) {
  return apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(id)}/finance-clear`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function adminClearHrExit(id, body) {
  return apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(id)}/admin-clear`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function hrFinalClearHrExit(id, body) {
  return apiFetch(`/api/hr/exit-clearance/${encodeURIComponent(id)}/hr-final-clear`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchHrTemporaryAlerts() {
  return apiFetch('/api/hr/staff/temporary-alerts');
}

export function fetchHrPromotionDue(dueOnly = false) {
  const q = dueOnly ? '?dueOnly=1' : '';
  return apiFetch(`/api/hr/reports/promotion-due${q}`);
}

export function generateLeaveDecisionLetter(requestId, letterKind) {
  return apiFetch(`/api/hr/leave-requests/${encodeURIComponent(requestId)}/decision-letter`, {
    method: 'POST',
    body: JSON.stringify({ letterKind }),
  });
}

export function downloadHrReportCsv(kind) {
  return apiFetch(`/api/hr/reports/export/${encodeURIComponent(kind)}`);
}

export const ABSENCE_TYPES = [
  { value: 'illness', label: 'Illness' },
  { value: 'family_emergency', label: 'Family emergency' },
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'official', label: 'Official duty' },
  { value: 'other', label: 'Other' },
];

export const SEPARATION_TYPES = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'layoff', label: 'Lay-off' },
  { value: 'retrenchment', label: 'Retrenchment' },
  { value: 'dismissal', label: 'Dismissal' },
];
