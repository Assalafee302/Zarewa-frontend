import { apiFetch } from './apiBase';

export function fetchStaffSalaryHistory(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/salary-history`);
}

export function fetchStaffFeedback(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/feedback`);
}

export function createStaffFeedbackNote({ subjectUserId, body }) {
  return apiFetch('/api/hr/feedback', {
    method: 'POST',
    body: JSON.stringify({ subjectUserId, body }),
  });
}

export function fetchStaffAppraisalSummary(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/appraisal-summary`);
}

export function fetchStaffActivitySummary(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/activity-summary`);
}

export function fetchDisciplineCasesForUser(userId) {
  return apiFetch(`/api/hr/discipline-cases?userId=${encodeURIComponent(userId)}`);
}

export function bulkUpdateHrStaff({ userIds, lineManagerUserId, accountStatus }) {
  return apiFetch('/api/hr/staff/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ userIds, lineManagerUserId, accountStatus }),
  });
}
