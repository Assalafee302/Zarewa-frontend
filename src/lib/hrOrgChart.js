import { apiFetch } from './apiBase';

export function fetchHrOrgChart() {
  return apiFetch('/api/hr/org-chart');
}
