/** HR Reports Hub — category labels and API helpers. */

import { apiUrl } from './apiBase';

export const REPORT_CATEGORY_LABELS = {
  employee: 'Employee Reports',
  attendance: 'Attendance Reports',
  leave: 'Leave Reports',
  payroll: 'Payroll & Benefits Reports',
  development: 'Performance & Development Reports',
  discipline: 'Discipline & Exit Reports',
  compliance: 'Compliance Reports',
};

export function buildReportQuery(filters = {}) {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') q.set(k, String(v).trim());
  });
  return q.toString();
}

export function fetchHrReportCatalog() {
  return fetch(apiUrl('/api/hr/reports/catalog'), { credentials: 'include' }).then(async (r) => {
    const data = await r.json();
    return { ok: r.ok, data };
  });
}

export function fetchHrReportPreview(kind, filters = {}) {
  const q = buildReportQuery(filters);
  return fetch(apiUrl(`/api/hr/reports/preview/${encodeURIComponent(kind)}?${q}`), {
    credentials: 'include',
  }).then(async (r) => {
    const data = await r.json();
    return { ok: r.ok && data?.ok, data };
  });
}

export function fetchHrOperationalReadiness() {
  return fetch(apiUrl('/api/hr/operational-readiness'), { credentials: 'include' }).then(async (r) => {
    const data = await r.json();
    return { ok: r.ok && data?.ok, data };
  });
}

/** @param {string} kind @param {'csv'|'xlsx'|'pdf'} format @param {Record<string,string>} filters */
export async function downloadHrReport(kind, format, filters = {}) {
  const q = buildReportQuery({ ...filters, format });
  const r = await fetch(apiUrl(`/api/hr/reports/export/${encodeURIComponent(kind)}?${q}`), {
    credentials: 'include',
  });
  if (!r.ok) {
    let err = 'Export failed.';
    try {
      const j = await r.json();
      err = j.error || err;
    } catch { /* ignore */ }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
    `hr-${kind}.${format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, filename };
}
