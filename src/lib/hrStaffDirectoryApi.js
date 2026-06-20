import { apiFetch } from './apiBase';

/** @param {Record<string, string | number | undefined>} params */
export function fetchHrStaffDirectory(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return apiFetch(`/api/hr/staff/directory${qs ? `?${qs}` : ''}`);
}

export function fetchHrDirectoryViews() {
  return apiFetch('/api/hr/staff/directory-views');
}

export function saveHrDirectoryView({ id, name, snapshot }) {
  return apiFetch('/api/hr/staff/directory-views', {
    method: 'POST',
    body: JSON.stringify({ id, name, snapshot }),
  });
}

export function deleteHrDirectoryView(viewId) {
  return apiFetch(`/api/hr/staff/directory-views/${encodeURIComponent(viewId)}`, { method: 'DELETE' });
}

export function updateStaffProbation(userId, body) {
  return apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/probation`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function orgChartExportCsvUrl() {
  return '/api/hr/org-chart/export.csv';
}
