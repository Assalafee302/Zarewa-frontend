import { apiUrl } from './apiBase';
import { hrSensitiveHeaders } from './hrSensitiveStorage';

const EXPORT_KINDS = {
  treasury: 'treasury',
  payslips: 'payslips',
  statutory: 'statutory',
  gl: 'gl',
};

/** Download payroll CSV export (locked or paid runs). */
export async function downloadHrPayrollExport(runId, kind = 'treasury') {
  const segment = EXPORT_KINDS[kind] || kind;
  const path = `/api/hr/payroll-runs/${encodeURIComponent(runId)}/export/${segment}`;
  const r = await fetch(apiUrl(path), { credentials: 'include' });
  if (!r.ok) {
    const text = await r.text();
    let err = 'Export failed.';
    try {
      const j = JSON.parse(text);
      err = j.error || err;
    } catch {
      err = text.slice(0, 200) || err;
    }
    return { ok: false, error: err };
  }
  const blob = await r.blob();
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
    `payroll-${segment}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export function payrollStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'emerald';
  if (s === 'locked') return 'blue';
  return 'amber';
}

export function formatPeriodYyyymm(yyyymm) {
  const p = String(yyyymm || '');
  if (p.length !== 6) return p || '—';
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}
