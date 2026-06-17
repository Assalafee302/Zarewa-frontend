import { hasPermissionInList } from './moduleAccess';

const MONITORING_ROLE_KEYS = new Set(['admin', 'md', 'ceo', 'sales_manager']);

/** Mirrors server/workspaceOps.js getWorkspaceMonitoring access rules. */
export function userMayViewWorkspaceMonitoring(roleKey, permissions) {
  const perms = Array.isArray(permissions) ? permissions : [];
  if (hasPermissionInList(perms, 'reports.view') || hasPermissionInList(perms, 'office.use')) {
    return true;
  }
  const rk = String(roleKey || '')
    .trim()
    .toLowerCase();
  return MONITORING_ROLE_KEYS.has(rk) || hasPermissionInList(perms, '*');
}
