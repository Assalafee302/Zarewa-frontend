/** HR staff registration / profile form options. */

export const HR_PAYROLL_GROUPS = [
  { value: 'branch_ops', label: 'Branch staff' },
  { value: 'mining_div', label: 'Mining division' },
  { value: 'scholarship', label: 'Scholarship / school' },
  { value: 'chairman_staffs', label: 'Domestic staff' },
];

export const HR_EMPLOYMENT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
  { value: 'intern', label: 'Intern' },
];

/** System roles HR may assign when registering staff (excludes admin/md). */
export const HR_REGISTERABLE_ROLES = [
  { value: 'sales_staff', label: 'Sales officer' },
  { value: 'sales_manager', label: 'Branch manager (sales)' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'operations_officer', label: 'Operations officer' },
  { value: 'finance_manager', label: 'Finance manager' },
  { value: 'hr_admin', label: 'HR / Admin' },
  { value: 'gmhr', label: 'GM HR' },
  { value: 'viewer', label: 'Viewer (read-only)' },
];

export const HR_DISCIPLINARY_KINDS = [
  { value: 'warning', label: 'Verbal / written warning' },
  { value: 'query', label: 'Query letter' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'final_warning', label: 'Final warning' },
  { value: 'other', label: 'Other' },
];

export const HR_LEAVE_BANDS = [
  { value: '', label: 'Default (policy)' },
  { value: 'standard', label: 'Standard' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];

export function emptyStaffForm(defaultBranchId = '') {
  return {
    username: '',
    displayName: '',
    password: '',
    roleKey: 'sales_staff',
    branchId: defaultBranchId,
    employeeNo: '',
    jobTitle: '',
    department: '',
    employmentType: 'permanent',
    dateJoinedIso: new Date().toISOString().slice(0, 10),
    probationEndIso: '',
    lineManagerUserId: '',
    selfServiceEligible: true,
    payrollGroup: 'branch_ops',
    salaryLevel: '',
    salaryStep: '1',
    baseSalaryNgn: '',
    housingAllowanceNgn: '',
    transportAllowanceNgn: '',
    payeTaxPercent: '',
    pensionPercentOverride: '',
    taxId: '',
    pensionRsaPin: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNoMasked: '',
    minimumQualification: '',
    academicQualification: '',
    promotionGrade: '',
    trainingSummary: '',
    welfareNotes: '',
    leaveEntitlementBand: '',
    branchChangeReason: '',
  };
}
