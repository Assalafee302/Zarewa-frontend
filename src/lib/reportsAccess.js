import { hasPermissionInList } from './moduleAccess';
import { isBranchManagerApprovalAuthority } from '../shared/workspaceGovernance';

const MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS = new Set(['admin', 'md', 'ceo', 'sales_manager', 'finance_manager']);

/** Mirrors server `userMayViewManagementReports` — management `/reports` module, not ad-hoc customer exports. */
export function userMayViewManagementReportsClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (!MANAGEMENT_REPORTS_VIEWER_ROLE_KEYS.has(rk)) return false;
  return hasPermissionInList(permissions, 'reports.view');
}

/** Branch manager Command Centre — Intelligence tab only (not full exec dashboard). */
export function userMayAccessBranchCommandCentreClient(roleKey, permissions) {
  return isBranchManagerApprovalAuthority(roleKey) && userMayViewManagementReportsClient(roleKey, permissions);
}

/** Full exec Command Centre (overview, decide, finance, etc.). */
export function userMayAccessExecutiveCommandCentreClient(permissions) {
  return hasPermissionInList(permissions, 'exec.dashboard.view');
}
