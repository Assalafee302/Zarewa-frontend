import { apiFetch } from './apiBase';

export function fetchHrDepartments(includeInactive = false) {
  const q = includeInactive ? '?all=1' : '';
  return apiFetch(`/api/hr/departments${q}`);
}

export function saveHrDepartment(body) {
  const id = body?.id ? `/${encodeURIComponent(body.id)}` : '';
  return apiFetch(`/api/hr/departments${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export function fetchHrDesignations({ departmentId, includeInactive = false } = {}) {
  const q = new URLSearchParams();
  if (departmentId) q.set('departmentId', departmentId);
  if (includeInactive) q.set('all', '1');
  const qs = q.toString();
  return apiFetch(`/api/hr/designations${qs ? `?${qs}` : ''}`);
}

export function fetchDesignationTenureEligibility(designationId, { userId, dateJoinedIso } = {}) {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  if (dateJoinedIso) q.set('dateJoinedIso', dateJoinedIso);
  const qs = q.toString();
  return apiFetch(`/api/hr/designations/${encodeURIComponent(designationId)}/tenure-eligibility${qs ? `?${qs}` : ''}`);
}

export function fetchStaffTenure(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/tenure`);
}

export function saveHrDesignation(body) {
  const id = body?.id ? `/${encodeURIComponent(body.id)}` : '';
  return apiFetch(`/api/hr/designations${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export function fetchHrNotificationSummary() {
  return apiFetch('/api/hr/notification-summary');
}

export function fetchHrTeamSummary(scope = 'team') {
  const q = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  return apiFetch(`/api/hr/team/summary${q}`);
}

export function fetchHrAnalyticsDashboard() {
  return apiFetch('/api/hr/analytics/dashboard');
}

export function fetchStaffLoanSchedule(userId) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/loan-schedule`);
}
