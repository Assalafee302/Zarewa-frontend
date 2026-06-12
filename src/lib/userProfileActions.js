import {
  canAccessExecutiveHr,
  canAccessMainHrWorkspace,
  canAccessTeamHr,
  canMarkHrAttendance,
  canRequestMyLeave,
  canViewMyPayslips,
  hrHasPermission,
} from './hrAccess';
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
      id: 'edit-profile',
      label: 'Edit profile',
      description: 'Display name, email, and photo',
      to: '/me/account',
      category: 'account',
      tone: 'teal',
      icon: '👤',
    },
    {
      id: 'change-password',
      label: 'Change password',
      description: 'Update your sign-in password',
      to: '/me/security',
      category: 'account',
      tone: 'slate',
      icon: '🔒',
    },
  ];

  if (cohort === 'scholarship') {
    actions.push({
      id: 'school-profile',
      label: 'My school',
      description: 'Fees, stipend step, and term dates',
      to: '/me/school',
      category: 'self_service',
      tone: 'violet',
      icon: '🎓',
    });
    if (hr('hr.my_documents.view')) {
      actions.push({
        id: 'upload-document',
        label: 'My documents',
        description: 'Upload certificates and files',
        to: '/me/documents',
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
      id: 'apply-leave',
      label: 'Apply for leave',
      description: 'Submit a leave request',
      to: '/me/leave',
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
      to: '/me/loans',
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
      to: '/me/documents',
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
      to: '/me/payslips',
      category: 'self_service',
      tone: 'teal',
      icon: '📄',
    });
  }

  if (hr('hr.my_attendance.view') && cohort === 'employee') {
    actions.push({
      id: 'my-attendance',
      label: 'My attendance',
      description: 'Attendance records and guidance',
      to: '/me/attendance',
      category: 'self_service',
      tone: 'slate',
      icon: '🕐',
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
      to: '/me/employment',
      category: 'self_service',
      tone: 'slate',
      icon: '💼',
    });
    actions.push({
      id: 'policies',
      label: 'Policies',
      description: 'Company handbook and policies',
      to: '/me/policies',
      category: 'self_service',
      tone: 'slate',
      icon: '📋',
    });
    actions.push({
      id: 'grievance',
      label: 'Feedback & grievance',
      description: 'Raise feedback or a grievance',
      to: '/me/grievance',
      category: 'self_service',
      tone: 'violet',
      icon: '💬',
    });
    actions.push({
      id: 'id-card',
      label: 'Staff ID card',
      description: 'View or print your ID',
      to: '/me/id-card',
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

/** @param {string} cohort */
export function buildUserProfileNav(cohort, hasHrSelfService) {
  const base = [
    { to: '/me', label: 'Overview', end: true },
    { to: '/me/account', label: 'Account' },
    { to: '/me/security', label: 'Security' },
  ];

  if (cohort === 'scholarship') {
    return [
      ...base,
      { to: '/me/school', label: 'My school' },
      { to: '/me/documents', label: 'Documents' },
    ];
  }

  if (!hasHrSelfService) return base;

  if (cohort === 'domestic') {
    return [
      ...base,
      { to: '/me/payslips', label: 'Payslips' },
      { to: '/me/documents', label: 'Documents' },
      { to: '/me/policies', label: 'Policies' },
    ];
  }

  const employee = [
    ...base,
    { to: '/me/leave', label: 'Leave' },
    { to: '/me/loans', label: 'Loans' },
    { to: '/me/documents', label: 'Documents' },
    { to: '/me/payslips', label: 'Payslips' },
    { to: '/me/employment', label: 'Employment' },
    { to: '/me/policies', label: 'Policies' },
    { to: '/me/grievance', label: 'Feedback' },
    { to: '/me/id-card', label: 'ID card' },
  ];

  if (cohort === 'employee') {
    employee.splice(5, 0, { to: '/me/attendance', label: 'Attendance' });
  }

  return employee;
}

export const USER_PROFILE_ACTION_CATEGORIES = [
  { key: 'account', label: 'Account' },
  { key: 'self_service', label: 'Self-service' },
  { key: 'team', label: 'Team & management' },
  { key: 'workspace', label: 'Workspaces' },
];
