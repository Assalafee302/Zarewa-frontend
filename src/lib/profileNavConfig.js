import {
  BadgeCheck,
  Banknote,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Gift,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Scale,
  ScrollText,
  Shield,
  Wallet,
} from 'lucide-react';
import { FAMILY_BENEFITS } from './familyBenefitsUi';
import { DOMESTIC_BENEFITS } from './domesticStaffUi';
import { HR_SELF_SERVICE_BASE } from './hrSelfServiceRoutes';

/**
 * @typedef {{ to: string; label: string; icon: import('lucide-react').LucideIcon; end?: boolean; primary?: boolean }} ProfileNavItem
 * @typedef {{ id: string; label: string; items: ProfileNavItem[] }} ProfileNavGroup
 */

/** @type {Record<string, { title: string; subtitle: string }>} */
const EMPLOYEE_PAGE_META = {
  overview: { title: 'Overview', subtitle: 'Leave, pay, and requests at a glance' },
  'time-off': { title: 'Time off', subtitle: 'Leave balances, attendance marks, and exceptions' },
  requests: { title: 'My requests', subtitle: 'Track leave, loan, and profile change requests' },
  payslips: { title: 'Payslips', subtitle: 'View payslips after payroll is locked and paid' },
  loans: { title: 'Loans & credit', subtitle: 'Balances, payroll deductions, and new applications' },
  employment: { title: 'Employment', subtitle: 'Job details, compensation, and personal record' },
  documents: { title: 'Documents', subtitle: 'Uploads, letters, and verification checklist' },
  'id-card': { title: 'ID card', subtitle: 'Request or replace your company ID card' },
  benefits: { title: 'Benefits', subtitle: 'Allowances and benefits on your staff record' },
  policies: { title: 'Policies', subtitle: 'Read and sign required company policies' },
  grievance: { title: 'Feedback', subtitle: 'Raise concerns or suggest improvements' },
  surveys: { title: 'Surveys', subtitle: 'HR and engagement surveys' },
  discipline: { title: 'Conduct', subtitle: 'Conduct records and acknowledgements' },
};

/** @type {ProfileNavGroup[]} */
export const EMPLOYEE_PROFILE_NAV = [
  {
    id: 'work',
    label: 'Work & pay',
    items: [
      { to: '/my-profile/overview', label: 'Overview', icon: LayoutDashboard, end: true, primary: true },
      { to: '/my-profile/time-off', label: 'Time off', icon: CalendarDays, primary: true },
      { to: '/my-profile/requests', label: 'My requests', icon: FileText, primary: true },
      { to: '/my-profile/payslips', label: 'Payslips', icon: Receipt, primary: true },
      { to: '/my-profile/loans', label: 'Loans & credit', icon: Wallet, primary: true },
    ],
  },
  {
    id: 'record',
    label: 'My record',
    items: [
      { to: '/my-profile/employment', label: 'Employment', icon: Briefcase, primary: true },
      { to: '/my-profile/documents', label: 'Documents', icon: FolderOpen, primary: true },
      { to: '/my-profile/id-card', label: 'ID card', icon: BadgeCheck },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    items: [
      { to: '/my-profile/benefits', label: 'Benefits', icon: Gift },
      { to: '/my-profile/policies', label: 'Policies', icon: ScrollText },
      { to: '/my-profile/grievance', label: 'Feedback', icon: MessageSquare },
      { to: '/my-profile/surveys', label: 'Surveys', icon: ClipboardList },
      { to: '/my-profile/discipline', label: 'Conduct', icon: Scale },
    ],
  },
];

/** @type {ProfileNavGroup[]} */
export const SCHOLARSHIP_PROFILE_NAV = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/my-profile/school', label: FAMILY_BENEFITS.navOverview, icon: GraduationCap, end: true, primary: true },
      { to: '/my-profile/payments', label: FAMILY_BENEFITS.navPayments, icon: Banknote, primary: true },
      { to: '/my-profile/requests', label: FAMILY_BENEFITS.navRequests, icon: FileText, primary: true },
      { to: '/my-profile/documents', label: FAMILY_BENEFITS.navDocuments, icon: FolderOpen, primary: true },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { to: '/my-profile/policies', label: FAMILY_BENEFITS.navPolicies, icon: ScrollText },
      { to: '/my-profile/grievance', label: FAMILY_BENEFITS.navContact, icon: MessageSquare },
    ],
  },
];

/** @type {ProfileNavGroup[]} */
export const DOMESTIC_PROFILE_NAV = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/my-profile/home', label: DOMESTIC_BENEFITS.navOverview, icon: Home, end: true, primary: true },
      { to: '/my-profile/payments', label: DOMESTIC_BENEFITS.navPayments, icon: Banknote, primary: true },
      { to: '/my-profile/documents', label: DOMESTIC_BENEFITS.navDocuments, icon: FolderOpen, primary: true },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { to: '/my-profile/policies', label: DOMESTIC_BENEFITS.navPolicies, icon: Shield },
      { to: '/my-profile/grievance', label: DOMESTIC_BENEFITS.navContact, icon: MessageSquare },
    ],
  },
];

/**
 * @param {string} cohort
 * @returns {ProfileNavGroup[]}
 */
export function profileNavForCohort(cohort) {
  if (cohort === 'scholarship') return SCHOLARSHIP_PROFILE_NAV;
  if (cohort === 'domestic') return DOMESTIC_PROFILE_NAV;
  return EMPLOYEE_PROFILE_NAV;
}

/**
 * @param {string} cohort
 * @returns {ProfileNavItem[]}
 */
export function profileNavFlatItems(cohort) {
  return profileNavForCohort(cohort).flatMap((g) => g.items);
}

/**
 * Primary tabs shown on mobile (max 5) + More overflow.
 * @param {string} cohort
 * @returns {ProfileNavItem[]}
 */
export function profileNavPrimaryItems(cohort) {
  const all = profileNavFlatItems(cohort);
  const marked = all.filter((i) => i.primary);
  if (marked.length >= 3) return marked.slice(0, 5);
  return all.slice(0, 5);
}

/**
 * @param {string} cohort
 * @returns {ProfileNavItem[]}
 */
export function profileNavMoreItems(cohort) {
  const all = profileNavFlatItems(cohort);
  const primarySet = new Set(profileNavPrimaryItems(cohort).map((i) => i.to));
  return all.filter((i) => !primarySet.has(i.to));
}

/**
 * Page header copy for the active My HR route.
 * @param {string} pathname
 * @param {string} cohort
 * @returns {{ title: string; subtitle: string }}
 */
export function profilePageMetaForPath(pathname, cohort = 'employee') {
  const base = HR_SELF_SERVICE_BASE;
  const path = String(pathname || '').replace(/\/+$/, '') || base;
  const section = path === base ? 'overview' : path.slice(base.length + 1).split('/')[0] || 'overview';

  if (cohort === 'scholarship') {
    const map = {
      school: { title: FAMILY_BENEFITS.navOverview, subtitle: FAMILY_BENEFITS.hubSubtitle },
      payments: { title: FAMILY_BENEFITS.paymentsPageTitle, subtitle: FAMILY_BENEFITS.paymentsSubtitle },
      requests: { title: FAMILY_BENEFITS.requestsTitle, subtitle: FAMILY_BENEFITS.requestsIntro },
      documents: { title: FAMILY_BENEFITS.navDocuments, subtitle: 'Upload school documents and fee invoices' },
      policies: { title: FAMILY_BENEFITS.navPolicies, subtitle: FAMILY_BENEFITS.policiesDescription },
      grievance: { title: FAMILY_BENEFITS.navContact, subtitle: FAMILY_BENEFITS.contactDescription },
    };
    return map[section] || { title: FAMILY_BENEFITS.hubTitle, subtitle: FAMILY_BENEFITS.hubSubtitle };
  }

  if (cohort === 'domestic') {
    const map = {
      home: { title: DOMESTIC_BENEFITS.navOverview, subtitle: DOMESTIC_BENEFITS.hubSubtitle },
      payments: { title: DOMESTIC_BENEFITS.paymentsPageTitle, subtitle: DOMESTIC_BENEFITS.paymentsSubtitle },
      documents: { title: DOMESTIC_BENEFITS.navDocuments, subtitle: 'Employment documents on file' },
      policies: { title: DOMESTIC_BENEFITS.navPolicies, subtitle: DOMESTIC_BENEFITS.policiesDescription },
      grievance: { title: DOMESTIC_BENEFITS.navContact, subtitle: DOMESTIC_BENEFITS.contactDescription },
    };
    return map[section] || { title: DOMESTIC_BENEFITS.hubTitle, subtitle: DOMESTIC_BENEFITS.hubSubtitle };
  }

  const navMatch = profileNavFlatItems(cohort).find(
    (item) => path === item.to || (item.end ? false : path.startsWith(`${item.to}/`))
  );
  const meta = EMPLOYEE_PAGE_META[section];
  if (meta) return meta;
  if (navMatch) {
    return { title: navMatch.label, subtitle: 'Your employment records and self-service tools' };
  }
  return { title: 'My HR', subtitle: 'Leave, pay, documents, and your employment records' };
}

/**
 * Eyebrow label for the My HR shell header.
 * @param {string} cohort
 */
export function profileShellEyebrow(cohort) {
  if (cohort === 'scholarship') return FAMILY_BENEFITS.hubSwitcherLabel;
  if (cohort === 'domestic') return DOMESTIC_BENEFITS.hubSwitcherLabel;
  return 'My HR';
}
