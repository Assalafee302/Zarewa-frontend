import {
  canAccessExecutiveHr,
  canAccessMainHrWorkspace,
  canAccessMyProfileHr,
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
 * }} UserProfileAction
 */

/**
 * Build action tiles for the signed-in user (not HR-admin navigation).
 * @param {{
 *   permissions?: string[];
 *   roleKey?: string;
 *   canAccessModule?: (key: string) => boolean;
 * }} ctx
 * @returns {UserProfileAction[]}
 */
export function buildUserProfileActions(ctx = {}) {
  const permissions = ctx.permissions || [];
  const roleKey = String(ctx.roleKey || '').trim().toLowerCase();
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
    },
    {
      id: 'change-password',
      label: 'Change password',
      description: 'Update your sign-in password',
      to: '/me/security',
      category: 'account',
      tone: 'slate',
    },
  ];

  if (canModule('settings')) {
    actions.push({
      id: 'preferences',
      label: 'Dashboard preferences',
      description: 'Home layout and personal targets',
      to: '/settings/preferences',
      category: 'account',
      tone: 'slate',
    });
  }

  if (hr('hr.self') || canAccessMyProfileHr(permissions)) {
    actions.push({
      id: 'school-profile',
      label: 'My school profile',
      description: 'Scholarship fees, stipend step, and term dates',
      to: '/my-profile/school',
      category: 'self_service',
      tone: 'violet',
    });
  }

  if (canRequestMyLeave(permissions) || hr('hr.my_leave.request')) {
    actions.push({
      id: 'apply-leave',
      label: 'Apply for leave',
      description: 'Submit a leave request',
      to: '/my-profile/leave',
      category: 'self_service',
      tone: 'teal',
    });
  }

  if (hr('hr.my_loan.request') || canAccessMyProfileHr(permissions)) {
    actions.push({
      id: 'apply-loan',
      label: 'Apply for loan',
      description: 'Staff loan application',
      to: '/my-profile/loans',
      category: 'self_service',
      tone: 'amber',
    });
  }

  if (hr('hr.my_documents.view') || canAccessMyProfileHr(permissions)) {
    actions.push({
      id: 'upload-document',
      label: 'Upload document',
      description: 'Certificates, IDs, and files',
      to: '/my-profile/documents',
      category: 'self_service',
      tone: 'violet',
    });
  }

  if (canViewMyPayslips(permissions)) {
    actions.push({
      id: 'payslips',
      label: 'View payslips',
      description: 'Download salary slips',
      to: '/my-profile/payslips',
      category: 'self_service',
      tone: 'teal',
    });
  }

  if (hr('hr.my_attendance.view') || canAccessMyProfileHr(permissions)) {
    actions.push({
      id: 'my-attendance',
      label: 'My attendance',
      description: 'Attendance history and records',
      to: '/my-profile/attendance',
      category: 'self_service',
      tone: 'slate',
    });
  }

  if (hr('hr.self') || canAccessMyProfileHr(permissions)) {
    actions.push({
      id: 'policies',
      label: 'Policies & handbook',
      description: 'Company HR policies',
      to: '/my-profile/policies',
      category: 'self_service',
      tone: 'slate',
    });
    actions.push({
      id: 'grievance',
      label: 'Feedback & grievance',
      description: 'Raise feedback or a grievance',
      to: '/my-profile/grievance',
      category: 'self_service',
      tone: 'violet',
    });
    actions.push({
      id: 'employment',
      label: 'Employment record',
      description: 'Job details and HR profile',
      to: '/my-profile/employment',
      category: 'self_service',
      tone: 'slate',
    });
    actions.push({
      id: 'id-card',
      label: 'Staff ID card',
      description: 'View or print your ID',
      to: '/my-profile/id-card',
      category: 'self_service',
      tone: 'teal',
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
    });
  }

  return actions;
}

export const USER_PROFILE_ACTION_CATEGORIES = [
  { key: 'account', label: 'Account' },
  { key: 'self_service', label: 'Self-service' },
  { key: 'team', label: 'Team & management' },
  { key: 'workspace', label: 'Workspaces' },
];
