import { hasPermissionInList } from './moduleAccess';

const MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS = new Set(['admin', 'md', 'ceo', 'chairman', 'sales_manager', 'finance_manager']);

/** Mirrors server `userMayViewManagementReports` — management `/reports` module, not ad-hoc customer exports. */
export function userMayViewManagementReportsClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (!MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS.has(rk)) return false;
  return hasPermissionInList(permissions, 'reports.view');
}

/** Branch manager Command Centre — retired; BM uses `/manager` only (no `/exec`). */
export function userMayAccessBranchCommandCentreClient(_roleKey, _permissions) {
  return false;
}

/** Full exec Command Centre (overview, decide, finance, etc.). */
export function userMayAccessExecutiveCommandCentreClient(permissions) {
  return hasPermissionInList(permissions, 'exec.dashboard.view');
}
