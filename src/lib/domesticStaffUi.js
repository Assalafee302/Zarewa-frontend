/**
 * Display copy for Chairman/CEO household staff — executive benefits (not branch payroll).
 * Internal payroll key stays `chairman_staffs`; this module is user-facing language only.
 *
 * Most household staff do not use the ERP — admin manages records, salary, and payments.
 */

export const DOMESTIC_BENEFITS = {
  hubTitle: 'My pay',
  hubEyebrow: 'Executive household staff',
  hubSubtitle:
    'If you have ERP access, you can view salary payments here. Most household staff are managed by the office — no login required.',
  badgeLabel: 'Household staff',
  navOverview: 'Overview',
  navPayments: 'Payments',
  navDocuments: 'Documents',
  navPolicies: 'Policies & notices',
  navContact: 'Contact office',

  hubExplainer:
    'Your monthly salary is paid through Zarewa Executive benefits — the same channel used for the Chairman and CEO household, separate from branch payroll. The office manages your record on your behalf.',

  salaryLabel: 'Monthly salary',
  salaryHint: 'Paid via Executive benefits',

  checklistTitle: 'Your setup checklist',
  checklistSubtitle: 'The office maintains these records for you',

  paymentsTitle: 'Payment history',
  paymentsSubtitle: 'Monthly salary paid on your behalf',
  paymentsEmpty: 'No payments on record yet',
  paymentsEmptyHint: 'Your monthly salary will appear here once processed by the office.',

  pdfStatement: 'Download statement',
  paymentsPageTitle: 'My payments',
  pdfStatementTitle: 'PDF statement',
  pdfStatementSubtitle: 'Download a record of monthly salary payments',

  accountTeaserTitle: 'Salary & role',
  accountTeaserSubtitle: 'Your household employment at a glance',
  accountTeaserAction: 'Open My pay',

  profileSetupTitle: 'Pay setup',
  profileSetupHint: 'The office manages your pay record. Contact them for updates.',

  hubSwitcherLabel: 'My pay',

  policiesDescription: 'Company policies and employment notices',
  contactDescription: 'Questions about your salary or employment record',

  adminRegisterTab: 'Household staff',
  adminRegisterTitle: 'Household staff register',
  adminRegisterHint:
    'Most household staff do not use the ERP. Add and pay staff in Executive benefits — no login required.',
  adminRegisterOptionalHint:
    'Use this register only when a staff member needs their own ERP login. Otherwise manage everything in Executive benefits.',

  adminDashboardTitle: 'Household staff overview',
  adminDashboardSubtitle:
    'Manage Chairman and CEO household staff — salary, bank details, and payments. No ERP login required for staff.',
  adminDashboardEmpty: 'No household staff on record yet.',
  adminDashboardEmptyHint: 'Add staff in Executive benefits → Household staff. ERP login is optional.',

  adminWorkflowTitle: 'How admin manages household staff',
  adminWorkflowSteps: [
    'Register staff in Executive benefits → Household staff (name, role, salary, bank details).',
    'Process monthly salary through Payment approvals and Bank export.',
    'Download payment statements for staff from this overview — no staff login needed.',
    'Optional: create an ERP account in the register below only if a staff member will use self-service.',
  ],

  adminManagedBadge: 'Admin-managed',
  adminManagedHint: 'No ERP login — office handles pay and records',
  adminStatementAction: 'Download statement',
  adminManageAction: 'Manage salary & bank',

  staffFormSection: 'Executive household staff',
  staffFormHint: 'Link the Executive benefits domestic record so monthly salary payments stay accurate.',

  payrollGroupLabel: 'Household staff',

  benefitsTabHint:
    'Primary register for household staff. Add staff here — they do not need ERP access. Process salary in Payment approvals.',
};

/** @param {string | null | undefined} key */
export function assignedExecutiveLabel(key) {
  const v = String(key || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'chairman' || v.includes('chairman')) return 'Chairman';
  if (v === 'ceo' || v.includes('chief executive')) return 'Chief Executive Officer';
  if (v === 'md' || v.includes('managing director')) return 'Managing Director';
  return String(key).replace(/_/g, ' ');
}

/** Employer line for hero cards — e.g. "Employed by Chairman" */
export function domesticEmployerLine(profile) {
  const label =
    profile?.assignedExecutiveLabel || assignedExecutiveLabel(profile?.assignedExecutive);
  if (label) return `Employed by ${label}`;
  return 'Executive household staff';
}
