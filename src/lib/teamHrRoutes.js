/** Canonical Team HR route paths. */

export const TEAM_HR_BASE = '/team-hr';
export const TEAM_HR_STAFF = '/team-hr/staff';
export const TEAM_HR_ORG_CHART = '/team-hr/org-chart';
export const TEAM_HR_TIME_ABSENCE = '/team-hr/time-absence';

/** @deprecated — redirects to TEAM_HR_TIME_ABSENCE */
export const TEAM_HR_REQUESTS = '/team-hr/requests';
/** @deprecated */
export const TEAM_HR_ATTENDANCE = '/team-hr/attendance';
/** @deprecated */
export const TEAM_HR_LEAVE_CALENDAR = '/team-hr/leave-calendar';

/** @param {string} tab @param {Record<string, string>} [extra] */
export function teamHrTimeAbsencePath(tab, extra = {}) {
  const params = new URLSearchParams({ tab, ...extra });
  return `${TEAM_HR_TIME_ABSENCE}?${params.toString()}`;
}
