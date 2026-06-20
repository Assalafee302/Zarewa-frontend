import { apiUrl } from './apiBase';

const EXPORT_KINDS = {
  treasury: 'treasury',
  'bank-upload': 'bank-upload',
  'approval-report': 'approval-report',
  'hr-approval': 'hr-approval',
  payslips: 'payslips',
  'payslips-pdf': 'payslips-pdf',
  statutory: 'statutory',
  gl: 'gl',
};

/** Full month names for payroll period pickers and labels. */
export const PAYROLL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** @param {string | number | null | undefined} yyyymm */
export function parsePayrollPeriod(yyyymm) {
  const p = String(yyyymm || '').replace(/\D/g, '').slice(0, 6);
  if (p.length !== 6) return null;
  const year = Number(p.slice(0, 4));
  const month = Number(p.slice(4, 6));
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month, yyyymm: p };
}

/** @param {number | string} year @param {number | string} month 1–12 */
export function periodYyyymmFromParts(year, month) {
  const y = Math.round(Number(year) || 0);
  const m = Math.round(Number(month) || 0);
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return '';
  return `${y}${String(m).padStart(2, '0')}`;
}

/** User-facing label: "June 2025". */
export function formatPayrollPeriodLabel(yyyymm) {
  const parsed = parsePayrollPeriod(yyyymm);
  if (!parsed) return String(yyyymm || '').trim() || '—';
  return `${PAYROLL_MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

/** Compact label for charts: "Jun 2025". */
export function formatPayrollPeriodShort(yyyymm) {
  const parsed = parsePayrollPeriod(yyyymm);
  if (!parsed) return String(yyyymm || '').trim() || '—';
  return `${PAYROLL_MONTH_NAMES[parsed.month - 1].slice(0, 3)} ${parsed.year}`;
}

/** @deprecated Use formatPayrollPeriodLabel — kept for existing imports. */
export function formatPeriodYyyymm(yyyymm) {
  return formatPayrollPeriodLabel(yyyymm);
}

/** Sort payroll runs newest calendar month first. */
export function sortPayrollRunsByPeriod(runs = []) {
  return [...runs].sort((a, b) => {
    const pa = parsePayrollPeriod(a?.periodYyyymm)?.yyyymm || '';
    const pb = parsePayrollPeriod(b?.periodYyyymm)?.yyyymm || '';
    return pb.localeCompare(pa);
  });
}

/** Set of periodYyyymm strings already used by runs. */
export function payrollPeriodsInUse(runs = []) {
  return new Set(
    runs
      .map((r) => parsePayrollPeriod(r?.periodYyyymm)?.yyyymm)
      .filter(Boolean)
  );
}

/** Year options for period pickers (default: prior, current, next). */
export function payrollYearOptions(offsetBack = 1, offsetForward = 1) {
  const y = new Date().getFullYear();
  const out = [];
  for (let i = -offsetBack; i <= offsetForward; i += 1) out.push(y + i);
  return out;
}

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
  const isPdf =
    segment === 'payslips-pdf' ||
    segment === 'approval-report' ||
    (r.headers.get('content-type') || '').includes('pdf');
  const filename =
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
    `payroll-${segment}.${isPdf ? 'pdf' : 'csv'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

/** Download one employee payslip PDF for a payroll run. */
export async function downloadSinglePayslipPdf(runId, userId) {
  const path = `/api/hr/payroll-runs/${encodeURIComponent(runId)}/payslips/${encodeURIComponent(userId)}/pdf`;
  const r = await fetch(apiUrl(path), { credentials: 'include' });
  if (!r.ok) {
    const text = await r.text();
    let err = 'PDF download failed.';
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
    r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || `payslip-${runId}.pdf`;
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
