import {
  canAccessExecutiveHr,
  canAccessMainHrWorkspace,
  canAccessTeamHr,
  canMarkHrAttendance,
  canRequestMyLeave,
  canViewMyPayslips,
  hrHasPermission,
} from './hrAccess';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from './hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from './familyBenefitsUi';
import { DOMESTIC_BENEFITS } from './domesticStaffUi';
import { hasPermissionInList } from './moduleAccess';

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   description?: string;
 *   to: string;
 *   category: 'account' | 'self_service' | 'team' | 'workspace';
 *   tone?: 'teal' | 'amber' | 'violet' | 'slate';
 *   icon?: string;
 * }} UserProfileAction
 */

/**
 * @param {{
 *   permissions?: string[];
 *   roleKey?: string;
 *   canAccessModule?: (key: string) => boolean;
 *   cohort?: string;
 *   hasHrSelfService?: boolean;
 * }} ctx
 * @returns {UserProfileAction[]}
 */
export function buildUserProfileActions(ctx = {}) {
  const permissions = ctx.permissions || [];
  const roleKey = String(ctx.roleKey || '').trim().toLowerCase();
  const cohort = String(ctx.cohort || 'account_only');
  const hasHr = Boolean(ctx.hasHrSelfService);
  const canModule = typeof ctx.canAccessModule === 'function' ? ctx.canAccessModule : () => false;
  const has = (p) => hasPermissionInList(permissions, p);
  const hr = (p) => hrHasPermission(permissions, p);

  /** @type {UserProfileAction[]} */
  const actions = [
    {
      id: 'account-security',
      label: 'Account & security',
      description: 'Profile, email, photo, and password',
      to: ACCOUNT_PATH.account,
      category: 'account',
      tone: 'teal',
      icon: 'user',
    },
  ];

  if (cohort === 'scholarship') {
    actions.push({
      id: 'school-profile',
      label: FAMILY_BENEFITS.hubTitle,
      description: 'School fees, allowance, and term dates',
      to: HR_SELF_SERVICE_PATH.school,
      category: 'self_service',
      tone: 'violet',
      icon: 'school',
    });
    actions.push({
      id: 'scholarship-requests',
      label: 'Requests',
      description: 'Update school details or request fees',
      to: HR_SELF_SERVICE_PATH.requests,
      category: 'self_service',
      tone: 'violet',
      icon: 'fileText',
    });
    actions.push({
      id: 'scholarship-payments',
      label: 'My payments',
      description: 'School fees and allowance history',
      to: HR_SELF_SERVICE_PATH.payments,
      category: 'self_service',
      tone: 'violet',
      icon: 'creditCard',
    });
    if (hr('hr.my_documents.view')) {
      actions.push({
        id: 'upload-document',
        label: 'My documents',
        description: 'Upload certificates and files',
        to: HR_SELF_SERVICE_PATH.documents,
        category: 'self_service',
        tone: 'violet',
        icon: 'folderOpen',
      });
    }
    actions.push({
      id: 'policies',
      label: 'Policies',
      description: FAMILY_BENEFITS.policiesDescription,
      to: HR_SELF_SERVICE_PATH.policies,
      category: 'self_service',
      tone: 'violet',
      icon: 'scrollText',
    });
    actions.push({
      id: 'grievance',
      label: 'Contact office',
      description: FAMILY_BENEFITS.contactDescription,
      to: HR_SELF_SERVICE_PATH.grievance,
      category: 'self_service',
      tone: 'violet',
      icon: 'messageSquare',
    });
    return actions;
  }

  if (!hasHr) return actions;

  if (canRequestMyLeave(permissions) || hr('hr.my_leave.request')) {
    actions.push({
      id: 'leave-attendance',
      label: cohort === 'employee' ? 'Leave & attendance' : 'Leave',
      description:
        cohort === 'employee'
          ? 'Apply for leave and view attendance guidance'
          : 'Submit and track leave requests',
      to: HR_SELF_SERVICE_PATH.timeOff,
      category: 'self_service',
      tone: 'teal',
      icon: 'calendarDays',
    });
  }

  if (hr('hr.my_loan.request')) {
    actions.push({
      id: 'apply-loan',
      label: 'Apply for loan',
      description: 'Staff loan application',
      to: HR_SELF_SERVICE_PATH.loans,
      category: 'self_service',
      tone: 'amber',
      icon: 'wallet',
    });
  }

  if (hr('hr.my_documents.view')) {
    actions.push({
      id: 'upload-document',
      label: 'My documents',
      description: 'Certificates, IDs, and files',
      to: HR_SELF_SERVICE_PATH.documents,
      category: 'self_service',
      tone: 'violet',
      icon: 'folderOpen',
    });
  }

  if (canViewMyPayslips(permissions)) {
    actions.push({
      id: 'payslips',
      label: 'Payslips',
      description: 'View and download salary slips',
      to: HR_SELF_SERVICE_PATH.payslips,
      category: 'self_service',
      tone: 'teal',
      icon: 'receipt',
    });
  }

  if (cohort === 'domestic') {
    actions.push({
      id: 'domestic-home',
      label: DOMESTIC_BENEFITS.hubTitle,
      description: 'Monthly salary and payment history',
      to: HR_SELF_SERVICE_PATH.home,
      category: 'self_service',
      tone: 'amber',
      icon: 'home',
    });
    actions.push({
      id: 'domestic-payments',
      label: 'My payments',
      description: 'Salary payment history',
      to: HR_SELF_SERVICE_PATH.payments,
      category: 'self_service',
      tone: 'amber',
      icon: 'wallet',
    });
    if (hr('hr.my_documents.view')) {
      actions.push({
        id: 'upload-document',
        label: 'My documents',
        description: 'Upload certificates and files',
        to: HR_SELF_SERVICE_PATH.documents,
        category: 'self_service',
        tone: 'amber',
        icon: 'folderOpen',
      });
    }
    actions.push({
      id: 'policies',
      label: 'Policies',
      description: DOMESTIC_BENEFITS.policiesDescription,
      to: HR_SELF_SERVICE_PATH.policies,
      category: 'self_service',
      tone: 'amber',
      icon: 'scrollText',
    });
    actions.push({
      id: 'grievance',
      label: 'Contact office',
      description: DOMESTIC_BENEFITS.contactDescription,
      to: HR_SELF_SERVICE_PATH.grievance,
      category: 'self_service',
      tone: 'amber',
      icon: 'messageSquare',
    });
    return actions;
  }

  if (hr('hr.self') || hr('hr.my_profile.view')) {
    actions.push({
      id: 'employment',
      label: 'Employment record',
      description: 'Job details and HR profile',
      to: HR_SELF_SERVICE_PATH.employment,
      category: 'self_service',
      tone: 'slate',
      icon: 'briefcase',
    });
    actions.push({
      id: 'policies',
      label: 'Policies',
      description: 'Company handbook and policies',
      to: HR_SELF_SERVICE_PATH.policies,
      category: 'self_service',
      tone: 'slate',
      icon: 'scrollText',
    });
    actions.push({
      id: 'grievance',
      label: 'Feedback & grievance',
      description: 'Raise feedback or a grievance',
      to: HR_SELF_SERVICE_PATH.grievance,
      category: 'self_service',
      tone: 'violet',
      icon: 'messageSquare',
    });
    actions.push({
      id: 'id-card',
      label: 'Staff ID card',
      description: 'Request or track your ID card',
      to: HR_SELF_SERVICE_PATH.idCard,
      category: 'self_service',
      tone: 'teal',
      icon: 'badgeCheck',
    });
  }

  if (canMarkHrAttendance(permissions)) {
    actions.push({
      id: 'mark-attendance',
      label: 'Mark team attendance',
      description: 'Daily present / late / absent',
      to: '/team-hr/time-absence?tab=attendance',
      category: 'team',
      tone: 'teal',
      icon: 'checkCircle',
    });
  }

  if (canAccessTeamHr(permissions)) {
    actions.push({
      id: 'team-hr',
      label: 'Team HR',
      description: 'Endorse leave, loans, and incidents',
      to: '/team-hr',
      category: 'team',
      tone: 'amber',
      icon: 'users',
    });
  }

  if (['sales_manager', 'admin', 'md'].includes(roleKey) || has('sales.manage')) {
    actions.push({
      id: 'management',
      label: 'Management inbox',
      description: 'Orders, cash, and approvals',
      to: '/manager',
      category: 'team',
      tone: 'violet',
      icon: 'inbox',
    });
  }

  if (canModule('settings')) {
    actions.push({
      id: 'preferences',
      label: 'Dashboard preferences',
      description: 'Home layout and targets',
      to: '/settings/preferences',
      category: 'workspace',
      tone: 'slate',
      icon: 'settings',
    });
  }

  if (canAccessMainHrWorkspace(permissions)) {
    actions.push({
      id: 'hr-admin',
      label: 'HR administration',
      description: 'HQ people operations',
      to: '/hr',
      category: 'workspace',
      tone: 'teal',
      icon: 'building',
    });
  }

  if (canAccessExecutiveHr(permissions)) {
    actions.push({
      id: 'executive-hr',
      label: 'Executive HR',
      description: 'Executive people insights',
      to: '/executive-hr',
      category: 'workspace',
      tone: 'violet',
      icon: 'star',
    });
  }

  return actions;
}

/** @param {string} cohort @param {boolean} hasHrSelfService */
export function buildUserProfileNav(cohort, hasHrSelfService) {
  void cohort;
  void hasHrSelfService;
  return [
    { to: ACCOUNT_PATH.overview, label: 'Overview', end: true },
    { to: ACCOUNT_PATH.account, label: 'Account & security' },
    { to: ACCOUNT_PATH.services, label: 'All services' },
  ];
}

export const USER_PROFILE_ACTION_CATEGORIES = [
  { key: 'account', label: 'Account' },
  { key: 'self_service', label: 'HR self-service' },
  { key: 'team', label: 'Team & management' },
  { key: 'workspace', label: 'Workspaces' },
];
