/**
 * HQ HR sub-navigation — five work areas, with Records holding the rest.
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

/** @typedef {{ to: string; label: string; end?: boolean; match?: string[]; visible?: (permissions: string[]) => boolean }} HrNavItem */

function canSeePeople(p) {
  return hrHasPermission(p, 'hr.directory.view') || canManageHrStaff(p);
}

function canSeeTime(p) {
  return (
    canReviewHrRequests(p) ||
    canEndorseBranchHr(p) ||
    canGmApproveHrRequests(p) ||
    canManageHrLeave(p) ||
    canMarkHrAttendance(p) ||
    hrHasPermission(p, 'hr.attendance.manage') ||
    hrHasPermission(p, 'hr.attendance.upload')
  );
}

function canSeePay(p) {
  return (
    canPreparePayroll(p) ||
    canGmApprovePayroll(p) ||
    canPayPayroll(p) ||
    hrHasPermission(p, 'hr.loans.manage') ||
    hrHasPermission(p, 'hr.benefits.manage')
  );
}

function canSeeCases(p) {
  return (
    canManageHrDiscipline(p) ||
    canApproveHrLetters(p) ||
    canManageHrTransfers(p) ||
    hrHasPermission(p, 'hr.incidents.view') ||
    hrHasPermission(p, 'hr.incidents.manage')
  );
}

function canSeeFiles(p) {
  return (
    canGenerateHrLetters(p) ||
    canViewHrReports(p) ||
    hrHasPermission(p, 'hr.compliance') ||
    hrHasPermission(p, 'hr.letters.approve')
  );
}

/** @param {string} pathname @param {string} prefix */
export function hrPathStartsWith(pathname, prefix) {
  const path = String(pathname || '').split('?')[0];
  const base = String(prefix || '').split('?')[0];
  if (!base) return false;
  return path === base || path.startsWith(`${base}/`);
}

/**
 * @param {HrNavItem} item
 * @param {string} pathname
 */
export function hrNavItemIsActive(item, pathname) {
  const prefixes = item.match?.length ? item.match : [item.to];
  if (item.end) {
    const path = String(pathname || '').split('?')[0];
    return prefixes.some((prefix) => path === String(prefix).split('?')[0]);
  }
  return prefixes.some((prefix) => hrPathStartsWith(pathname, prefix));
}

function pickVisible(items, permissions) {
  return items
    .filter((item) => !item.visible || item.visible(permissions))
    .map((item) => {
      const out = { to: item.to, label: item.label, match: item.match || [item.to.split('?')[0]] };
      if (item.end) out.end = true;
      return out;
    });
}

/**
 * @param {string[] | undefined} permissions
 * @param {{ showExecutive?: boolean }} [opts]
 */
export function buildHrMainNav(permissions = [], opts = {}) {
  const showExecutive = Boolean(opts.showExecutive);

  const recordsChildren = pickVisible(
    [
      {
        to: '/hr/discipline-exit',
        label: 'Cases',
        match: ['/hr/discipline-exit'],
        visible: canSeeCases,
      },
      {
        to: '/hr/documents',
        label: 'Files',
        match: ['/hr/documents'],
        visible: canSeeFiles,
      },
      {
        to: '/hr/analytics',
        label: 'Insights',
        match: ['/hr/analytics'],
        visible: (p) => canViewHrReports(p),
      },
      {
        to: '/hr/settings',
        label: 'Setup',
        match: ['/hr/settings'],
        visible: (p) => canViewHrSettings(p),
      },
      {
        to: '/executive-hr',
        label: 'Executive',
        match: ['/executive-hr', '/hr/executive'],
        visible: () => showExecutive,
      },
    ],
    permissions
  );

  const recordsMatch = [
    '/hr/discipline-exit',
    '/hr/documents',
    '/hr/analytics',
    '/hr/settings',
    '/executive-hr',
    '/hr/executive',
  ];

  const navItems = pickVisible(
    [
      { to: '/hr/dashboard', label: 'Dashboard', end: true, match: ['/hr/dashboard'] },
      {
        to: '/hr/employees',
        label: 'People',
        match: ['/hr/employees', '/hr/talent'],
        visible: canSeePeople,
      },
      {
        to: '/hr/time-absence',
        label: 'Time',
        match: ['/hr/time-absence', '/hr/attendance', '/hr/leave'],
        visible: canSeeTime,
      },
      {
        to: '/hr/payroll',
        label: 'Pay',
        match: ['/hr/payroll'],
        visible: canSeePay,
      },
      recordsChildren.length
        ? {
            to: recordsChildren[0].to,
            label: 'Records',
            match: recordsMatch,
            visible: () => true,
          }
        : null,
    ].filter(Boolean),
    permissions
  );

  return { navItems, moreNavItems: [], secondaryNavItems: recordsChildren };
}
