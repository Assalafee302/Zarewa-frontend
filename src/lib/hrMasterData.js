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

export function saveHrDesignation(body) {
  const id = body?.id ? `/${encodeURIComponent(body.id)}` : '';
  return apiFetch(`/api/hr/designations${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export function fetchHrNotificationSummary() {
  return apiFetch('/api/hr/notification-summary');
}
