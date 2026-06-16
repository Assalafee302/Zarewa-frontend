/**
 * Display copy for CEO/Chairman children — executive family benefits (not a public scholarship).
 * Internal cohort/payroll keys stay `scholarship`; this module is user-facing language only.
 */

export const FAMILY_BENEFITS = {
  hubTitle: 'My benefits',
  hubEyebrow: 'Executive family benefits',
  hubSubtitle:
    'Zarewa pays your school fees and monthly allowance on behalf of your family. Track payments, submit requests, and upload documents here.',
  badgeLabel: 'Family benefits',
  navOverview: 'Overview',
  navPayments: 'Payments',
  navRequests: 'Requests',
  navDocuments: 'Documents',
  navPolicies: 'Policies & notices',
  navContact: 'Contact office',

  /** Short explainer shown on the beneficiary hub hero */
  hubExplainer:
    'Your school fees go directly to your school. Your monthly allowance covers personal expenses — both are managed through Zarewa Executive benefits.',

  stipendLabel: 'Monthly allowance',
  stipendHint: 'Personal expenses',
  schoolFeesLabel: 'School fees',
  schoolFeesHint: 'Paid to your school',

  checklistTitle: 'Your setup checklist',
  checklistSubtitle: 'Complete these steps so fees and allowance payments stay on track',

  paymentsTitle: 'Payment history',
  paymentsSubtitle: 'School fees paid on your behalf and monthly allowance',
  paymentsEmpty: 'No payments on record yet',
  paymentsEmptyHint: 'School fees and your monthly allowance will appear here once processed.',

  requestsEmpty: 'No requests yet',
  pdfStatement: 'Download statement',

  accountTeaserTitle: 'School & allowance',
  accountTeaserSubtitle: 'Your family benefits at a glance',
  accountTeaserAction: 'Open My benefits',

  profileSetupTitle: 'Benefits setup',
  profileSetupHint: 'Complete school details, documents, and policies in My benefits.',

  hubSwitcherLabel: 'My benefits',

  policiesDescription: 'Company policies and benefit notices',

  contactDescription: 'Questions about school fees or your allowance',

  adminRegisterTab: 'Executive family',
  adminRegisterTitle: 'Executive family register',
  adminRegisterHint:
    'CEO and Chairman\'s children — school fees and monthly allowance are paid via Executive benefits, not branch payroll.',
  adminRequestsTitle: 'Family benefit requests',
  adminRequestsEyebrow: 'Review queue',
  adminRequestsHint:
    'School detail updates and fee requests from executive family beneficiaries. Approved fees go to Executive benefits for payment.',

  staffFormSection: 'Executive family beneficiary',
  staffFormHint: 'Link the Executive benefits record (EXBEN-…) so school fees and allowance payments stay accurate.',

  payrollGroupLabel: 'Executive family',

  requestsTitle: 'Requests',
  requestsIntro:
    'Ask the office to update your school details or process a new term\'s fees. Upload your fee invoice under Documents to speed things up.',
  requestsSubmitOffice: 'Submit to office',
  requestsProfileSuccess: 'Your school details update was submitted.',
  requestsFeeSuccess: 'Your school fee request was submitted.',
  requestsProfileBody: 'Request to update school details on my benefits profile.',

  paymentsPageTitle: 'My payments',
  pdfStatementTitle: 'PDF statement',
  pdfStatementSubtitle: 'Download a record of school fees and monthly allowance payments',

  adminExecutiveSubtitle:
    'CEO and Chairman family benefits — school fees, monthly allowances, domestic staff, and payments separate from branch payroll.',
  adminStipendsTab: 'Monthly allowances',
  adminBeneficiariesTab: 'Executive family',
  adminActiveAllowances: 'Active allowances',
  adminAllowancesDueMonth: 'Allowances due this month',
  adminAllowanceExport: 'Family allowance payment export',

  familyDashboardTitle: 'Family benefits overview',
  familyDashboardSubtitle:
    'All CEO and Chairman children — school fees and monthly allowance status at a glance.',
  familyDashboardEmpty: 'No executive family beneficiaries on record yet.',
  familyDashboardEmptyHint: 'Register children in the Executive family register and link their benefits records.',
};

/** @param {string | null | undefined} key */
export function linkedExecutiveLabel(key) {
  const v = String(key || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'chairman' || v.includes('chairman')) return 'Chairman';
  if (v === 'ceo' || v.includes('chief executive')) return 'Chief Executive Officer';
  if (v === 'md' || v.includes('managing director')) return 'Managing Director';
  return String(key).replace(/_/g, ' ');
}

/** @param {string | null | undefined} type */
export function beneficiaryTypeLabel(type) {
  const v = String(type || '').trim().toLowerCase();
  const map = {
    chairman_child: "Chairman's child",
    ceo_child: "CEO's child",
    director_child: "Director's child",
    sponsored_student: 'Executive family',
  };
  return map[v] || (v ? String(type).replace(/_/g, ' ') : null);
}

/** Parent line for hero cards — e.g. "Linked to Chairman" */
export function familyParentLine(profile) {
  const label =
    profile?.linkedExecutiveLabel ||
    linkedExecutiveLabel(profile?.linkedExecutive || profile?.linkedExecutiveKey);
  if (label) return `Beneficiary of ${label}`;
  return 'Executive family beneficiary';
}
