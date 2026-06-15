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
      icon: '👤',
    },
  ];

  if (cohort === 'scholarship') {
    actions.push({
      id: 'school-profile',
      label: 'My school',
      description: 'Fees, stipend step, and term dates',
      to: HR_SELF_SERVICE_PATH.school,
      category: 'self_service',
      tone: 'violet',
      icon: '🎓',
    });
    if (hr('hr.my_documents.view')) {
      actions.push({
        id: 'upload-document',
        label: 'My documents',
        description: 'Upload certificates and files',
        to: HR_SELF_SERVICE_PATH.documents,
        category: 'self_service',
        tone: 'violet',
        icon: '📂',
      });
    }
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
      to: HR_SELF_SERVICE_PATH.leave,
      category: 'self_service',
      tone: 'teal',
      icon: '🏖️',
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
      icon: '💰',
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
      icon: '📂',
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
      icon: '📄',
    });
  }

  if (cohort === 'domestic') {
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
      icon: '💼',
    });
    actions.push({
      id: 'policies',
      label: 'Policies',
      description: 'Company handbook and policies',
      to: HR_SELF_SERVICE_PATH.policies,
      category: 'self_service',
      tone: 'slate',
      icon: '📋',
    });
    actions.push({
      id: 'grievance',
      label: 'Feedback & grievance',
      description: 'Raise feedback or a grievance',
      to: HR_SELF_SERVICE_PATH.grievance,
      category: 'self_service',
      tone: 'violet',
      icon: '💬',
    });
    actions.push({
      id: 'id-card',
      label: 'Staff ID card',
      description: 'Request or track your ID card',
      to: HR_SELF_SERVICE_PATH.idCard,
      category: 'self_service',
      tone: 'teal',
      icon: '🪪',
    });
  }

  if (canMarkHrAttendance(permissions)) {
    actions.push({
      id: 'mark-attendance',
      label: 'Mark team attendance',
      description: 'Daily present / late / absent',
      to: '/manager?inbox=attendance',
      category: 'team',
      tone: 'teal',
      icon: '✅',
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
      icon: '👥',
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
      icon: '📥',
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
      icon: '⚙️',
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
      icon: '🏢',
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
      icon: '⭐',
    });
  }

  return actions;
}

/** @param {string} cohort @param {boolean} hasHrSelfService */
export function buildUserProfileNav(cohort, hasHrSelfService) {
  const nav = [
    { to: ACCOUNT_PATH.overview, label: 'Overview', end: true },
    { to: ACCOUNT_PATH.account, label: 'Account & security' },
    { to: ACCOUNT_PATH.services, label: 'All services' },
  ];

  if (hasHrSelfService) {
    nav.push({
      to: HR_SELF_SERVICE_PATH.overview,
      label: cohort === 'scholarship' ? 'HR profile' : 'HR self-service',
    });
  }

  return nav;
}

export const USER_PROFILE_ACTION_CATEGORIES = [
  { key: 'account', label: 'Account' },
  { key: 'self_service', label: 'HR self-service' },
  { key: 'team', label: 'Team & management' },
  { key: 'workspace', label: 'Workspaces' },
];
