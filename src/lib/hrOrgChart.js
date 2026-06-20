import { apiFetch } from './apiBase';

export function fetchHrOrgChart() {
  return apiFetch('/api/hr/org-chart');
}

/**
 * Set or clear a staff member's line manager (organogram relationship).
 * @param {string} subjectUserId
 * @param {string | null} lineManagerUserId
 */
export function applyOrgLineManager(subjectUserId, lineManagerUserId) {
  const userId = String(subjectUserId || '').trim();
  if (!userId) return Promise.resolve({ ok: false, data: { ok: false, error: 'Staff not selected.' } });
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lineManagerUserId: lineManagerUserId || null }),
  });
}
