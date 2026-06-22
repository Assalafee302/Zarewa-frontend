/** Canonical HQ HR route paths (Phase 1 consolidated navigation). */

export const HR_BASE = '/hr';
export const HR_DASHBOARD = '/hr/dashboard';
export const HR_EMPLOYEES = '/hr/employees';
export const HR_EMPLOYEE_REGISTERS = '/hr/employees/registers';
export const HR_TIME_ABSENCE = '/hr/time-absence';
/** @deprecated Use HR_TIME_ABSENCE — kept for legacy redirects and bookmarks. */
export const HR_ATTENDANCE = '/hr/attendance';
/** @deprecated Use HR_TIME_ABSENCE — kept for legacy redirects and bookmarks. */
export const HR_LEAVE = '/hr/leave';
export const HR_PAYROLL = '/hr/payroll';
export const HR_TALENT = '/hr/talent';
/** @deprecated Use HR_TALENT */
export const HR_RECRUITMENT = '/hr/recruitment';
/** @deprecated Use HR_TALENT */
export const HR_DEVELOPMENT = '/hr/development';
export const HR_DISCIPLINE_EXIT = '/hr/discipline-exit';
export const HR_DOCUMENTS = '/hr/documents';
export const HR_SETTINGS = '/hr/settings';
/** @deprecated Leave/profile approvals use HR_TIME_ABSENCE; loans use HR_PAYROLL. */
export const HR_REQUESTS = '/hr/requests';

/** @param {string} tab @param {Record<string, string>} [extra] */
export function hrTimeAbsencePath(tab, extra = {}) {
  return hrTabPath(HR_TIME_ABSENCE, tab, extra);
}

/** @param {string} scope */
export function hrTimeAbsenceQueuePath(scope) {
  return hrTimeAbsencePath('approvals', { scope });
}
export const HR_EXECUTIVE = '/hr/executive';
export const HR_EXECUTIVE_CHAIRMAN = '/hr/executive/chairman';

/** @param {string} userId */
export function hrEmployeeProfilePath(userId) {
  return `${HR_EMPLOYEES}/${encodeURIComponent(userId)}`;
}

/** @param {string} base @param {string} tab @param {Record<string, string>} [extra] */
export function hrTabPath(base, tab, extra = {}) {
  const params = new URLSearchParams({ tab, ...extra });
  return `${base}?${params.toString()}`;
}

/** Deep link to a specific monthly payroll run. */
export function hrPayrollRunPath(runId) {
  if (!runId) return hrTabPath(HR_PAYROLL, 'payroll-runs');
  return hrTabPath(HR_PAYROLL, 'payroll-runs', { runId: String(runId) });
}

/** Payroll hub — staff loans & purchase credit tab. */
export const HR_PAYROLL_TAB_STAFF_CREDIT = 'staff-credit';

/** @deprecated Use HR_PAYROLL_TAB_STAFF_CREDIT — kept for bookmarks and legacy links. */
export const HR_PAYROLL_TAB_LOANS_LEGACY = 'loans';

/** Sub-sections under staff credit (`?section=`). */
export const HR_STAFF_CREDIT_SECTION = {
  LOAN_REQUESTS: 'requests',
  BALANCES: 'obligations',
  PURCHASE_CREDIT: 'purchase-credit',
};

/** Deep link to HR payroll staff loans & credit hub. */
export function hrStaffCreditPath(section = '', extra = {}) {
  const params = section ? { section, ...extra } : { ...extra };
  return hrTabPath(HR_PAYROLL, HR_PAYROLL_TAB_STAFF_CREDIT, params);
}

/** Normalize legacy `?tab=loans` to canonical staff-credit tab id. */
export function resolvePayrollStaffCreditTab(rawTab) {
  return rawTab === HR_PAYROLL_TAB_LOANS_LEGACY ? HR_PAYROLL_TAB_STAFF_CREDIT : rawTab;
}

/** Finance accounting desk — payroll bank payments tab. */
export function hrFinancePayrollPath(runId) {
  const params = new URLSearchParams({ tab: 'payroll' });
  if (runId) params.set('runId', String(runId));
  return `/accounting?${params.toString()}`;
}

/** Deep-link state for HR dashboard (React Router `location.state`). */
export function hrDashboardDeepLink({ openRequestId, focusHrAlertFilter } = {}) {
  /** @type {Record<string, string>} */
  const state = {};
  if (openRequestId) state.openRequestId = openRequestId;
  if (focusHrAlertFilter) state.focusHrAlertFilter = focusHrAlertFilter;
  return { pathname: HR_DASHBOARD, state };
}
