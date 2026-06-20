/**
 * Client HR permission helpers (keep in sync with server/hrPermissions.js).
 */

import { hasPermissionInList } from './moduleAccess.js';

export const HR_MODULE_PERMISSIONS = [
  'hr.directory.view',
  'hr.staff.manage',
  'hr.requests.review',
  'hr.requests.hr_review',
  'hr.requests.gm_approve',
  'hr.requests.final_approve',
  'hr.payroll.prepare',
  'hr.payroll.manage',
  'hr.payroll.gm_approve',
  'hr.reports.view',
  'hr.settings.manage',
  'hr.letters.generate',
  'hr.letters.approve',
  'hr.staff.import',
];

export const TEAM_HR_PERMISSIONS = [
  'hr.team.view',
  'hr.attendance.mark',
  'hr.daily_roll.mark',
  'hr.leave.endorse',
  'hr.loan.endorse',
  'hr.branch.endorse_staff',
];

export const MY_PROFILE_HR_PERMISSIONS = [
  'hr.self',
  'hr.my_profile.view',
  'hr.my_leave.request',
  'hr.my_loan.request',
  'hr.my_attendance.view',
  'hr.my_payslip.view',
  'hr.my_documents.view',
];

export const EXECUTIVE_HR_PERMISSIONS = [
  'hr.executive.view',
  'hr.branch_contribution.mark',
  'hr.executive.benefits.view',
  'hr.executive.benefits.manage',
  'hr.executive.benefits.export',
  'hr.chairman.manage',
];

/** @param {string[] | undefined} permissions */
export function canAccessExecutiveBenefits(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return (
    hrHasPermission(permissions, 'hr.executive.benefits.view') ||
    hrHasPermission(permissions, 'hr.executive.benefits.manage') ||
    hrHasPermission(permissions, 'hr.chairman.manage') ||
    hrHasPermission(permissions, 'hr.executive.view')
  );
}

/** Company-wide pension rates — HR Executive / settings admin only. */
export function canEditPensionPolicyRates(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return (
    hrHasPermission(permissions, 'hr.executive.benefits.manage') ||
    hrHasPermission(permissions, 'hr.chairman.manage') ||
    hrHasPermission(permissions, 'hr.payroll.md_approve') ||
    hrHasPermission(permissions, 'hr.settings.manage')
  );
}

/** Leave entitlements and staff loan limits — mirrors PATCH /api/hr/policy-config. */
export function canEditLeavePolicy(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return (
    hrHasPermission(permissions, 'hr.settings.manage') ||
    hrHasPermission(permissions, 'hr.staff.manage') ||
    hrHasPermission(permissions, 'hr.payroll.manage') ||
    hrHasPermission(permissions, 'hr.executive.benefits.manage') ||
    hrHasPermission(permissions, 'hr.payroll.md_approve')
  );
}

/** Read-only org structure in Administration (departments, titles, branches). */
export function canViewHrOrgStructure(permissions) {
  return canManageHrSettings(permissions) || hrHasPermission(permissions, 'hr.directory.view');
}

/** @param {string[] | undefined} permissions */
export function canViewHrSettings(permissions) {
  return canViewHrOrgStructure(permissions) || canEditLeavePolicy(permissions);
}

/** Executive-only keys — do not unlock main HR admin workspace (Phase 10). */
export const HR_EXECUTIVE_ONLY_PERMISSIONS = ['hr.executive.view', 'hr.payroll.md_approve'];

/** Main /hr/* workspace — excludes executive-only MD keys. */
export const MAIN_HR_WORKSPACE_PERMISSIONS = [...HR_MODULE_PERMISSIONS];

const SENSITIVE_VIEW = [
  'hr.payroll.view_sensitive',
  'hr.payroll.prepare',
  'hr.payroll.manage',
  'hr.payroll.gm_approve',
  'hr.payroll.md_approve',
  'hr.staff.manage',
  'hr.executive.view',
];

/**
 * @param {string[] | undefined} permissions
 * @param {string} permission
 */
export function hrHasPermission(permissions, permission) {
  if (!permission) return false;
  if (hasPermissionInList(permissions, '*')) return true;
  if (hasPermissionInList(permissions, permission)) return true;
  if (permission === 'hr.requests.review') {
    return hasPermissionInList(permissions, 'hr.requests.hr_review');
  }
  if (permission === 'hr.requests.gm_approve') {
    return hasPermissionInList(permissions, 'hr.requests.final_approve');
  }
  return false;
}

/** @param {string[] | undefined} permissions */
export function canAccessHrModule(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return HR_MODULE_PERMISSIONS.some((p) => hrHasPermission(permissions, p));
}

/** Main /hr/* workspace — excludes team-only, self-only, and executive-only MD users. */
export function canAccessMainHrWorkspace(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return MAIN_HR_WORKSPACE_PERMISSIONS.some((p) => hrHasPermission(permissions, p));
}

/** @param {string[] | undefined} permissions */
export function canAccessTeamHr(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return TEAM_HR_PERMISSIONS.some((p) => hrHasPermission(permissions, p));
}

/** @param {string[] | undefined} permissions */
export function canAccessMyProfileHr(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (MY_PROFILE_HR_PERMISSIONS.some((p) => hrHasPermission(permissions, p))) return true;
  return canAccessMainHrWorkspace(permissions) || canAccessTeamHr(permissions);
}

/** @param {string[] | undefined} permissions */
export function canAccessScholarshipDomesticExecutive(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (!canAccessExecutiveBenefits(permissions)) return false;
  return (
    hrHasPermission(permissions, 'hr.chairman.manage') ||
    hrHasPermission(permissions, 'hr.executive.benefits.manage') ||
    hrHasPermission(permissions, 'hr.directory.view') ||
    hrHasPermission(permissions, 'hr.staff.manage')
  );
}

/** @param {string[] | undefined} permissions */
export function canViewScholarshipDomesticRegisters(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (canAccessExecutiveBenefits(permissions)) return true;
  return hrHasPermission(permissions, 'hr.directory.view') || hrHasPermission(permissions, 'hr.staff.manage');
}

/** @param {string[] | undefined} permissions */
export function canManageScholarshipDomesticRegisters(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (
    hrHasPermission(permissions, 'hr.executive.benefits.manage') ||
    hrHasPermission(permissions, 'hr.chairman.manage') ||
    hrHasPermission(permissions, 'hr.special_beneficiary.manage')
  ) {
    return true;
  }
  return hrHasPermission(permissions, 'hr.staff.manage');
}

/** @param {string[] | undefined} permissions */
export function canAccessExecutiveHr(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return EXECUTIVE_HR_PERMISSIONS.some((p) => hrHasPermission(permissions, p));
}

/** @param {string[] | undefined} permissions */
export function canViewOrgSensitiveHr(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return SENSITIVE_VIEW.some((p) => hrHasPermission(permissions, p));
}

/** @param {string[] | undefined} permissions */
export function canReviewHrRequests(permissions) {
  return hrHasPermission(permissions, 'hr.requests.review') || hrHasPermission(permissions, 'hr.staff.manage');
}

/** @param {string[] | undefined} permissions */
export function canGmApproveHrRequests(permissions) {
  return hrHasPermission(permissions, 'hr.requests.gm_approve');
}

/** @param {string[] | undefined} permissions */
export function canEndorseBranchHr(permissions) {
  return (
    hrHasPermission(permissions, 'hr.branch.endorse_staff') || hrHasPermission(permissions, 'hr.leave.endorse')
  );
}

/** @param {string[] | undefined} permissions */
export function canMarkHrAttendance(permissions) {
  return (
    hrHasPermission(permissions, 'hr.attendance.mark') ||
    hrHasPermission(permissions, 'hr.daily_roll.mark') ||
    hrHasPermission(permissions, 'hr.attendance.manage')
  );
}

/** @param {string[] | undefined} permissions */
export function canManageHrLeave(permissions) {
  return hrHasPermission(permissions, 'hr.leave.manage') || hrHasPermission(permissions, 'hr.staff.manage');
}

/** @param {string[] | undefined} permissions */
export function canManageHrDeductions(permissions) {
  return (
    hrHasPermission(permissions, 'hr.deductions.manage') ||
    hrHasPermission(permissions, 'hr.attendance.manage') ||
    hrHasPermission(permissions, 'hr.staff.manage')
  );
}

/** @param {string[] | undefined} permissions */
export function canRequestMyLeave(permissions) {
  return hrHasPermission(permissions, 'hr.my_leave.request') || canAccessMyProfileHr(permissions);
}

/** @param {string[] | undefined} permissions */
export function canPreparePayroll(permissions) {
  return hrHasPermission(permissions, 'hr.payroll.prepare') || hrHasPermission(permissions, 'hr.payroll.manage');
}

/** @param {string[] | undefined} permissions */
export function canGmApprovePayroll(permissions) {
  return hrHasPermission(permissions, 'hr.payroll.gm_approve');
}

/** @param {string[] | undefined} permissions */
export function canPayPayroll(permissions) {
  return hrHasPermission(permissions, 'hr.payroll.pay');
}

/** @param {string[] | undefined} permissions */
export function canMdApprovePayroll(permissions) {
  return hrHasPermission(permissions, 'hr.payroll.md_approve');
}

/** Managing Director approval for staff purchase credit (roofing / materials on credit). */
export function canApproveStaffPurchaseCredit(roleKey, permissions) {
  const rk = String(roleKey || '').toLowerCase();
  if (rk === 'md') return true;
  return hrHasPermission(permissions, 'hr.payroll.md_approve') || hrHasPermission(permissions, '*');
}

/** HR may reject pending purchase credit; only MD may approve. */
export function canRejectStaffPurchaseCredit(roleKey, permissions) {
  return (
    canApproveStaffPurchaseCredit(roleKey, permissions) ||
    hrHasPermission(permissions, 'hr.loans.manage') ||
    hrHasPermission(permissions, 'hr.staff.manage')
  );
}

/** Pause/resume payroll deductions and adjust loan or purchase credit schedule. */
export function canMaintainStaffObligations(permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  return hrHasPermission(permissions, 'hr.loan_maintain') || hrHasPermission(permissions, 'hr.loans.manage');
}

/** Chairman / MD waiver of remaining obligation balance. */
export function canChairmanWaiveObligation(permissions, roleKey) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (hrHasPermission(permissions, 'hr.chairman.manage')) return true;
  if (hrHasPermission(permissions, 'hr.payroll.md_approve')) return true;
  const rk = String(roleKey || '').toLowerCase();
  return rk === 'chairman' || rk === 'md';
}

/** GM final approve on loan requests flagged for Chairman policy waiver. */
export function canGmApproveChairmanWaiverLoan(request, permissions, roleKey) {
  if (request?.kind !== 'loan') return true;
  if (String(request?.status || '') !== 'gm_hr_review') return true;
  if (!request?.payload?.needsChairmanWaiver) return true;
  return canChairmanWaiveObligation(permissions, roleKey);
}

/** Loan request requires Chairman / MD at GM HR final step. */
export function loanRequestNeedsChairmanWaiver(request) {
  return request?.kind === 'loan' && Boolean(request?.payload?.needsChairmanWaiver);
}

/** @param {string[] | undefined} permissions */
export function canApproveSalaryReduction(permissions) {
  return (
    hrHasPermission(permissions, 'hr.special_increment.approve') ||
    hrHasPermission(permissions, 'hr.payroll.md_approve') ||
    hrHasPermission(permissions, '*')
  );
}

/** @param {string[] | undefined} permissions */
export function canExportPayroll(permissions) {
  return hrHasPermission(permissions, 'hr.payroll.export') || canPayPayroll(permissions);
}

/** @param {string[] | undefined} permissions */
export function canMarkBranchContribution(permissions) {
  return (
    hrHasPermission(permissions, 'hr.branch_contribution.mark') || canAccessExecutiveHr(permissions)
  );
}

/** @param {string[] | undefined} permissions */
export function canViewMyPayslips(permissions) {
  return hrHasPermission(permissions, 'hr.my_payslip.view') || canAccessMyProfileHr(permissions);
}

/** @param {string[] | undefined} permissions */
export function canManageHrStaff(permissions) {
  return hrHasPermission(permissions, 'hr.staff.manage');
}

/** @param {string[] | undefined} permissions */
export function canManageHrTransfers(permissions) {
  return hrHasPermission(permissions, 'hr.transfers.manage') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canManageHrDiscipline(permissions) {
  return hrHasPermission(permissions, 'hr.discipline.manage') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canManageHrBenefits(permissions) {
  return hrHasPermission(permissions, 'hr.benefits.manage') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canGenerateHrLetters(permissions) {
  return hrHasPermission(permissions, 'hr.letters.generate') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canManageHrSettings(permissions) {
  return hrHasPermission(permissions, 'hr.settings.manage') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canApproveHrLetters(permissions) {
  return hrHasPermission(permissions, 'hr.letters.approve') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canBulkImportStaff(permissions) {
  return hrHasPermission(permissions, 'hr.staff.import') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canViewHrReports(permissions) {
  return hrHasPermission(permissions, 'hr.reports.view') || canManageHrStaff(permissions);
}

/** @param {string[] | undefined} permissions */
export function canApproveExceptionalLoans(permissions) {
  return (
    hrHasPermission(permissions, 'hr.exceptional_loan.approve') ||
    hrHasPermission(permissions, 'hr.requests.gm_approve') ||
    canAccessExecutiveHr(permissions)
  );
}
