/** Month-end stock register period helpers — always end-of-month; UI shows month + year only. */

const WAITING_BY_STATUS = {
  draft: 'Waiting on print for count',
  printed: 'Waiting on store confirm',
  store_confirmed: 'Waiting on manager clearance',
  bm_approved: 'Waiting on procurement costing',
  procurement_costed: 'Waiting on capture & lock',
  md_approved: 'Waiting on capture & lock',
  locked: 'Month closed & locked',
};

/** Statuses that may capture/lock (MD step removed; legacy md_approved still allowed). */
export const CAPTURE_READY_STATUSES = ['procurement_costed', 'md_approved'];

export function isCaptureReadyStatus(status) {
  return CAPTURE_READY_STATUSES.includes(String(status || ''));
}

export function defaultStockRegisterMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** @param {string} monthKey YYYY-MM */
export function periodEndIsoFromMonthKey(monthKey) {
  const [ys, ms] = String(monthKey || '').split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) return '';
  const lastDay = new Date(y, m, 0).getDate();
  return `${ys}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function monthKeyFromPeriodEnd(periodEnd) {
  return String(periodEnd || '').slice(0, 7);
}

/** "July 2026" */
export function formatStockRegisterMonth(periodEndOrMonth) {
  const key = monthKeyFromPeriodEnd(periodEndOrMonth);
  const [ys, ms] = key.split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) return '—';
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

export function stockRegisterWaitingLabel(status) {
  const st = String(status || 'draft');
  return WAITING_BY_STATUS[st] || `Status: ${st.replace(/_/g, ' ')}`;
}

/** Month + waiting line for headers, e.g. "July 2026 · Waiting on manager clearance" */
export function stockRegisterPeriodBanner(periodEndOrMonth, status) {
  const month = formatStockRegisterMonth(periodEndOrMonth);
  const waiting = stockRegisterWaitingLabel(status);
  return `${month} · ${waiting}`;
}

/**
 * Map raw workflow status onto visible stepper keys (MD removed; legacy md_approved ≡ costed).
 * @param {string} status
 * @param {Array<{ key: string }>} steps
 */
export function stockRegisterStepIndex(status, steps) {
  const st = String(status || 'draft');
  const mapped = st === 'md_approved' ? 'procurement_costed' : st;
  return steps.findIndex((s) => s.key === mapped);
}
