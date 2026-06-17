import { HR_DOCUMENTS, HR_EMPLOYEES, HR_LEAVE, HR_PAYROLL, hrTabPath } from './hrRoutes';

/** Copy for each HR Settings tab — aligned with branch/HQ employee operations. */
export const HR_SETTINGS_TABS = [
  { id: 'structure', label: 'Roles & pay' },
  { id: 'organization', label: 'Org structure' },
  { id: 'policies', label: 'People policies' },
  { id: 'documents', label: 'References' },
];

export const HR_SETTINGS_TAB_COPY = {
  structure: {
    title: 'Roles, grades & pay structure',
    description:
      'Executive view of all job titles with full terms of reference, departments, salary matrix (level × step), and the company pay grade ladder.',
  },
  organization: {
    title: 'Organization structure',
    description:
      'Master departments and job titles for branch and HQ staff profiles. Used when registering employees, generating letters, and assigning salary levels.',
  },
  policies: {
    title: 'People policies',
    description:
      'Company-wide leave entitlements and staff loan limits for branch payroll staff. Individual bands and exceptions are set on each employee profile.',
  },
  documents: {
    title: 'References & numbering',
    description:
      'Official HR letter reference sequences and employee number formats. References are assigned when a letter is issued, not at draft.',
  },
};

/** What HR Settings covers vs other modules (shown once for full admins). */
export const HR_SETTINGS_SCOPE = {
  title: 'What belongs here',
  includes: [
    'Job titles with duties, qualifications, tenure gates, and default pay levels',
    'Salary matrix by payroll group (level × step)',
    'Departments, branch office mapping, and org catalog seed',
    'Leave entitlements and staff loan company defaults',
    'Letter reference and employee number formats',
  ],
  elsewhere: [
    'Payroll runs, salary matrix, pension rates → Payroll',
    'Public holidays and leave balances → Leave',
    'Executive family & household staff → Executive HR',
    'Letters workflow and HR exports → Documents',
  ],
};

/** Grouped shortcuts — operational modules, not duplicated settings. */
export const HR_SETTINGS_MODULE_LINK_GROUPS = [
  {
    title: 'Payroll & compensation',
    links: [
      {
        label: 'Roles & pay structure',
        hint: 'Titles, terms, matrix, grade ladder',
        to: hrTabPath(HR_SETTINGS, 'structure'),
      },
      {
        label: 'Salary matrix',
        hint: 'Levels and steps by payroll group',
        to: hrTabPath(HR_SETTINGS, 'structure'),
      },
      {
        label: 'Pension & statutory',
        hint: 'Pension rates, ITF/NSITF reference',
        to: hrTabPath(HR_PAYROLL, 'statutory'),
      },
      {
        label: 'PAYE & pension profiles',
        hint: 'Per-staff tax and pension setup',
        to: hrTabPath(HR_PAYROLL, 'tax-pension'),
      },
    ],
  },
  {
    title: 'Leave & attendance',
    links: [
      {
        label: 'Public holidays',
        hint: 'Company non-working days',
        to: hrTabPath(HR_LEAVE, 'holidays'),
      },
      {
        label: 'Leave balances',
        hint: 'Accrual, carry-over, and approvals',
        to: hrTabPath(HR_LEAVE, 'balances'),
      },
    ],
  },
  {
    title: 'Documents & reporting',
    links: [
      {
        label: 'HR letters',
        hint: 'Appointment, confirmation, and exit letters',
        to: hrTabPath(HR_DOCUMENTS, 'letters'),
      },
      {
        label: 'Reports hub',
        hint: 'Exports, compliance, and variance',
        to: hrTabPath(HR_DOCUMENTS, 'reports'),
      },
    ],
  },
  {
    title: 'Executive programmes',
    links: [
      {
        label: 'Executive benefits',
        hint: 'School fees, allowances, domestic payments',
        to: '/executive-hr/benefits',
      },
      {
        label: 'Family & household registers',
        hint: 'Executive family and optional domestic ERP records',
        to: `${HR_EMPLOYEES}?tab=scholarship`,
      },
    ],
  },
];

export const HR_SETTINGS_PAGE = {
  title: 'HR administration',
  description:
    'Company master data and policy defaults for branch and HQ employees. Day-to-day payroll, leave, and executive benefits are managed in their own modules.',
  policyOnlyDescription:
    'Company-wide leave and staff loan defaults for branch payroll staff.',
};
