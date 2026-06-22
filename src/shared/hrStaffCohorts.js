/**
 * HR staff cohorts — keep in sync with shared/lib/hrStaffCohorts.js (backend).
 */

export const HR_PAYROLL_GROUPS = {
  BRANCH_OPS: 'branch_ops',
  MINING: 'mining_div',
  HQ_ADMIN: 'hq_admin',
  SCHOLARSHIP: 'scholarship',
  DOMESTIC: 'chairman_staffs',
};

export const EMPLOYEE_DIRECTORY_GROUPS = [HR_PAYROLL_GROUPS.BRANCH_OPS];
export const SCHOLARSHIP_GROUPS = [HR_PAYROLL_GROUPS.SCHOLARSHIP];
export const DOMESTIC_GROUPS = [HR_PAYROLL_GROUPS.DOMESTIC];
export const BENEFICIARY_ONLY_PAYROLL_GROUPS = [
  HR_PAYROLL_GROUPS.SCHOLARSHIP,
  HR_PAYROLL_GROUPS.DOMESTIC,
];
export const ERP_ACCESS_RESTRICTED_PAYROLL_GROUPS = [HR_PAYROLL_GROUPS.MINING];
export const HQ_SPECIAL_GROUPS = [HR_PAYROLL_GROUPS.MINING, HR_PAYROLL_GROUPS.HQ_ADMIN];
export const NON_BRANCH_PAYROLL_GROUPS = [
  HR_PAYROLL_GROUPS.MINING,
  HR_PAYROLL_GROUPS.HQ_ADMIN,
  HR_PAYROLL_GROUPS.SCHOLARSHIP,
  HR_PAYROLL_GROUPS.DOMESTIC,
];
export const ATTENDANCE_EXEMPT_PAYROLL_GROUPS = [...NON_BRANCH_PAYROLL_GROUPS];

export const PAYROLL_GROUP_LABELS = {
  [HR_PAYROLL_GROUPS.BRANCH_OPS]: 'Branch staff',
  [HR_PAYROLL_GROUPS.MINING]: 'Mining division',
  [HR_PAYROLL_GROUPS.HQ_ADMIN]: 'HQ administrative',
  [HR_PAYROLL_GROUPS.SCHOLARSHIP]: 'Executive family',
  [HR_PAYROLL_GROUPS.DOMESTIC]: 'Household staff',
};

export function normalizePayrollGroup(payrollGroup) {
  const g = String(payrollGroup || HR_PAYROLL_GROUPS.BRANCH_OPS).trim();
  return g || HR_PAYROLL_GROUPS.BRANCH_OPS;
}

export function isBranchEmployee(payrollGroup) {
  return normalizePayrollGroup(payrollGroup) === HR_PAYROLL_GROUPS.BRANCH_OPS;
}

export function requiresAttendance(payrollGroup) {
  return isBranchEmployee(payrollGroup);
}

export function isNonBranchStaff(payrollGroup) {
  return NON_BRANCH_PAYROLL_GROUPS.includes(normalizePayrollGroup(payrollGroup));
}

export function isScholarshipBeneficiary(payrollGroup) {
  return normalizePayrollGroup(payrollGroup) === HR_PAYROLL_GROUPS.SCHOLARSHIP;
}

export function isDomesticStaff(payrollGroup) {
  return normalizePayrollGroup(payrollGroup) === HR_PAYROLL_GROUPS.DOMESTIC;
}

export function isBeneficiaryOnlyPayrollGroup(payrollGroup) {
  return BENEFICIARY_ONLY_PAYROLL_GROUPS.includes(normalizePayrollGroup(payrollGroup));
}

export function payrollGroupMayHaveLogin(payrollGroup) {
  return !isBeneficiaryOnlyPayrollGroup(payrollGroup);
}

export function isErpAccessRestrictedPayrollGroup(payrollGroup) {
  return ERP_ACCESS_RESTRICTED_PAYROLL_GROUPS.includes(normalizePayrollGroup(payrollGroup));
}

export const PAYROLL_RUN_ELIGIBLE_GROUPS = [
  HR_PAYROLL_GROUPS.BRANCH_OPS,
  HR_PAYROLL_GROUPS.HQ_ADMIN,
  HR_PAYROLL_GROUPS.MINING,
];

export function isPayrollRunEligible(payrollGroup) {
  return PAYROLL_RUN_ELIGIBLE_GROUPS.includes(normalizePayrollGroup(payrollGroup));
}

export function requiresPaye(payrollGroup) {
  return isPayrollRunEligible(payrollGroup);
}

export function requiresEmployeePensionDeduction(payrollGroup) {
  return isPayrollRunEligible(payrollGroup);
}

export function requiresEmployerPensionContribution(payrollGroup) {
  return isPayrollRunEligible(payrollGroup);
}

function parseProfileExtra(extra) {
  if (!extra) return {};
  if (typeof extra === 'object') return extra;
  try {
    return JSON.parse(String(extra));
  } catch {
    return {};
  }
}

export function staffMeetsPensionPolicy(staff) {
  if (!requiresEmployeePensionDeduction(staff?.payrollGroup)) return false;
  const extra = parseProfileExtra(staff?.profileExtraJson ?? staff?.profileExtra);
  if (extra?.statutory?.pensionExempt === true) return false;
  return true;
}

export function isStatutoryPayrollExempt(payrollGroup) {
  return !isPayrollRunEligible(payrollGroup);
}

export function usesExecutiveBenefitsMonthlyPay(payrollGroup) {
  const g = normalizePayrollGroup(payrollGroup);
  return g === HR_PAYROLL_GROUPS.SCHOLARSHIP || g === HR_PAYROLL_GROUPS.DOMESTIC;
}

export function payrollGroupLabel(payrollGroup) {
  return PAYROLL_GROUP_LABELS[normalizePayrollGroup(payrollGroup)] || String(payrollGroup || 'Staff');
}

export function payrollGroupsForCohort(cohort) {
  const c = String(cohort || 'employees').trim().toLowerCase();
  if (c === 'all') return null;
  if (c === 'scholarship') return [...SCHOLARSHIP_GROUPS];
  if (c === 'domestic') return [...DOMESTIC_GROUPS];
  if (c === 'hq_special' || c === 'hq-special') return [...HQ_SPECIAL_GROUPS];
  return [...EMPLOYEE_DIRECTORY_GROUPS];
}

/** Kaduna (HQ) — default cashier branch for HQ and mining when profile branch is unset. */
export const HQ_CASHIER_BRANCH_ID = 'BR-KD';

/**
 * Branch whose cashier pays approved loans and receives cash/bank repayments.
 * @param {{ branchId?: string | null; branch_id?: string | null; payrollGroup?: string | null; payroll_group?: string | null } | null | undefined} profile
 * @param {string} [fallbackBranchId]
 */
export function resolveStaffCashierBranchId(profile, fallbackBranchId = HQ_CASHIER_BRANCH_ID) {
  const explicit = String(profile?.branchId ?? profile?.branch_id ?? '').trim();
  if (explicit) return explicit;
  const payrollGroup = normalizePayrollGroup(profile?.payrollGroup ?? profile?.payroll_group);
  if (
    payrollGroup === HR_PAYROLL_GROUPS.HQ_ADMIN ||
    payrollGroup === HR_PAYROLL_GROUPS.MINING ||
    payrollGroup === HR_PAYROLL_GROUPS.DOMESTIC
  ) {
    return String(fallbackBranchId || HQ_CASHIER_BRANCH_ID).trim() || HQ_CASHIER_BRANCH_ID;
  }
  return String(fallbackBranchId || HQ_CASHIER_BRANCH_ID).trim() || HQ_CASHIER_BRANCH_ID;
}
