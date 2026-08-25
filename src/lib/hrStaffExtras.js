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

/**
 * Permanently delete several staff logins. Irreversible — prefer separation for leavers.
 * @param {{ userIds: string[]; reason: string; confirmPhrase: string }} payload
 */
export function bulkDeleteHrStaffPermanently(payload) {
  const userIds = Array.isArray(payload?.userIds)
    ? payload.userIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!userIds.length) {
    return Promise.resolve({ ok: false, data: { ok: false, error: 'Select at least one staff member.' } });
  }
  return apiFetch('/api/hr/staff/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({
      userIds,
      reason: payload?.reason,
      confirmPhrase: payload?.confirmPhrase,
    }),
  });
}

/** Logins for the absorb-into-admin picker (includes accounts with no HR file). */
export function fetchHrStaffMergeCandidates() {
  return apiFetch('/api/hr/staff?allUsers=1&includeInactive=1');
}

/**
 * Absorb one login into another. The keep login stays (including admin/MD). The extra login is removed.
 * @param {{ fromUserId: string; toUserId: string }} payload
 */
export function mergeHrStaffInto({ fromUserId, toUserId }) {
  const from = String(fromUserId || '').trim();
  const to = String(toUserId || '').trim();
  if (!from || !to) {
    return Promise.resolve({ ok: false, data: { ok: false, error: 'Select both logins.' } });
  }
  return apiFetch('/api/hr/staff/merge', {
    method: 'POST',
    body: JSON.stringify({ fromUserId: from, toUserId: to }),
  });
}
