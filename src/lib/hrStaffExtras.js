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

export function bulkUpdateHrStaff({ userIds, lineManagerUserId, accountStatus, branchId, flagForReview }) {
  return apiFetch('/api/hr/staff/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ userIds, lineManagerUserId, accountStatus, branchId, flagForReview }),
  });
}

/**
 * Permanently delete a staff login and HR data. Irreversible — prefer separation for leavers.
 * @param {string} userId
 * @param {{ reason: string; confirmUsername: string }} payload
 */
export function deleteHrStaffPermanently(userId, payload) {
  const id = String(userId || '').trim();
  if (!id) return Promise.resolve({ ok: false, data: { ok: false, error: 'Staff not selected.' } });
  return apiFetch(`/api/hr/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}
