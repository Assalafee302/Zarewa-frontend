/**
 * Permission-filtered HQ HR sub-navigation (primary bar + More dropdown).
 */
import {
  canEndorseBranchHr,
  canApproveHrLetters,
  canGenerateHrLetters,
  canGmApproveHrRequests,
  canGmApprovePayroll,
  canManageHrDiscipline,
  canManageHrLeave,
  canViewHrSettings,
  canManageHrStaff,
  canManageHrTransfers,
  canMarkHrAttendance,
  canPayPayroll,
  canPreparePayroll,
  canReviewHrRequests,
  canViewHrReports,
  hrHasPermission,
} from './hrAccess.js';

/** @typedef {{ to: string; label: string; end?: boolean; section?: 'more'; visible?: (permissions: string[]) => boolean }} HrNavDefinition */

/** @type {HrNavDefinition[]} */
const HR_NAV_DEFINITION = [
  { to: '/hr/dashboard', label: 'Dashboard', end: true },
  {
    to: '/hr/employees',
    label: 'Employees',
    visible: (p) => hrHasPermission(p, 'hr.directory.view') || canManageHrStaff(p),
  },
  {
    to: '/hr/requests',
    label: 'Requests',
    visible: (p) => canReviewHrRequests(p) || canEndorseBranchHr(p) || canGmApproveHrRequests(p),
  },
  {
    to: '/hr/attendance',
    label: 'Attendance',
    visible: (p) =>
      canMarkHrAttendance(p) ||
      hrHasPermission(p, 'hr.attendance.manage') ||
      hrHasPermission(p, 'hr.attendance.upload'),
  },
  {
    to: '/hr/leave',
    label: 'Leave',
    visible: (p) => canManageHrLeave(p) || canReviewHrRequests(p) || canGmApproveHrRequests(p),
  },
  {
    to: '/hr/payroll',
    label: 'Payroll',
    visible: (p) =>
      canPreparePayroll(p) ||
      canGmApprovePayroll(p) ||
      canPayPayroll(p) ||
      hrHasPermission(p, 'hr.loans.manage') ||
      hrHasPermission(p, 'hr.benefits.manage'),
  },
  {
    to: '/hr/discipline-exit',
    label: 'Staff cases & exit',
    visible: (p) =>
      canManageHrDiscipline(p) ||
      canApproveHrLetters(p) ||
      canManageHrTransfers(p) ||
      hrHasPermission(p, 'hr.incidents.view') ||
      hrHasPermission(p, 'hr.incidents.manage'),
  },
  {
    to: '/hr/documents',
    label: 'Documents',
    visible: (p) =>
      canGenerateHrLetters(p) ||
      canViewHrReports(p) ||
      hrHasPermission(p, 'hr.compliance') ||
      hrHasPermission(p, 'hr.letters.approve'),
  },
  {
    to: '/hr/settings',
    label: 'Administration',
    visible: (p) => canViewHrSettings(p),
  },
  { to: '/hr/recruitment', label: 'Recruitment', section: 'more', visible: (p) => canManageHrStaff(p) },
  { to: '/hr/development', label: 'Development', section: 'more', visible: (p) => canManageHrStaff(p) },
  { to: '/hr/analytics', label: 'Analytics', section: 'more', visible: (p) => canViewHrReports(p) },
];

/**
 * @param {string[] | undefined} permissions
 * @param {{ showExecutive?: boolean }} [opts]
 */
export function buildHrMainNav(permissions = [], opts = {}) {
  const filterVisible = (items) =>
    items
      .filter((item) => !item.visible || item.visible(permissions))
      .map((item) => {
        const out = { to: item.to, label: item.label };
        if (item.end) out.end = true;
        return out;
      });

  const navItems = filterVisible(HR_NAV_DEFINITION.filter((item) => item.section !== 'more'));
  const moreNavItems = filterVisible(HR_NAV_DEFINITION.filter((item) => item.section === 'more'));

  if (opts.showExecutive) {
    navItems.push({ to: '/executive-hr', label: 'Executive' });
  }

  return { navItems, moreNavItems };
}
