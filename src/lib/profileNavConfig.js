import {
  BadgeCheck,
  Banknote,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Clock,
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

/**
 * @typedef {{ to: string; label: string; icon: import('lucide-react').LucideIcon; end?: boolean; primary?: boolean }} ProfileNavItem
 * @typedef {{ id: string; label: string; items: ProfileNavItem[] }} ProfileNavGroup
 */

/** @type {ProfileNavGroup[]} */
export const EMPLOYEE_PROFILE_NAV = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { to: '/my-profile/overview', label: 'Overview', icon: LayoutDashboard, end: true, primary: true },
    ],
  },
  {
    id: 'work',
    label: 'Work & pay',
    items: [
      { to: '/my-profile/leave', label: 'Leave', icon: CalendarDays, primary: true },
      { to: '/my-profile/payslips', label: 'Payslips', icon: Receipt, primary: true },
      { to: '/my-profile/loans', label: 'Loans', icon: Wallet, primary: true },
      { to: '/my-profile/attendance', label: 'Attendance', icon: Clock },
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
