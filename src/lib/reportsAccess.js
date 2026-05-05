import { hasPermissionInList } from './moduleAccess';

const MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS = new Set(['admin', 'md', 'ceo', 'sales_manager']);

/** Mirrors server `userMayViewManagementReports` — management `/reports` module, not ad-hoc customer exports. */
export function userMayViewManagementReportsClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (!MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS.has(rk)) return false;
  return hasPermissionInList(permissions, 'reports.view');
}
