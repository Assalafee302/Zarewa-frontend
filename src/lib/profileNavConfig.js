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
 * @typedef {{ to: string; label: string; icon: import('lucide-react').LucideIcon; end?: boolean }} ProfileNavItem
 * @typedef {{ id: string; label: string; items: ProfileNavItem[] }} ProfileNavGroup
 */

/** @type {ProfileNavGroup[]} */
export const EMPLOYEE_PROFILE_NAV = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/my-profile/overview', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/my-profile/leave', label: 'Leave', icon: CalendarDays },
      { to: '/my-profile/payslips', label: 'Payslips', icon: Receipt },
      { to: '/my-profile/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    id: 'records',
    label: 'Records',
    items: [
      { to: '/my-profile/employment', label: 'Employment', icon: Briefcase },
      { to: '/my-profile/loans', label: 'Loans', icon: Wallet },
      { to: '/my-profile/attendance', label: 'Attendance', icon: Clock },
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
      { to: '/my-profile/discipline', label: 'Discipline', icon: Scale },
      { to: '/my-profile/surveys', label: 'Surveys', icon: ClipboardList },
    ],
  },
];

/** @type {ProfileNavGroup[]} */
export const SCHOLARSHIP_PROFILE_NAV = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { to: '/my-profile/school', label: FAMILY_BENEFITS.navOverview, icon: GraduationCap, end: true },
      { to: '/my-profile/payments', label: FAMILY_BENEFITS.navPayments, icon: Banknote },
      { to: '/my-profile/requests', label: FAMILY_BENEFITS.navRequests, icon: FileText },
      { to: '/my-profile/documents', label: FAMILY_BENEFITS.navDocuments, icon: FolderOpen },
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
      { to: '/my-profile/home', label: DOMESTIC_BENEFITS.navOverview, icon: Home, end: true },
      { to: '/my-profile/payments', label: DOMESTIC_BENEFITS.navPayments, icon: Banknote },
      { to: '/my-profile/documents', label: DOMESTIC_BENEFITS.navDocuments, icon: FolderOpen },
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
