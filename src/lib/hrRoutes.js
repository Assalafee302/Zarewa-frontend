/** Canonical HQ HR route paths (Phase 1 consolidated navigation). */

export const HR_BASE = '/hr';
export const HR_DASHBOARD = '/hr/dashboard';
export const HR_EMPLOYEES = '/hr/employees';
export const HR_ATTENDANCE = '/hr/attendance';
export const HR_LEAVE = '/hr/leave';
export const HR_PAYROLL = '/hr/payroll';
export const HR_RECRUITMENT = '/hr/recruitment';
export const HR_DEVELOPMENT = '/hr/development';
export const HR_DISCIPLINE_EXIT = '/hr/discipline-exit';
export const HR_DOCUMENTS = '/hr/documents';
export const HR_SETTINGS = '/hr/settings';
export const HR_REQUESTS = '/hr/requests';
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
