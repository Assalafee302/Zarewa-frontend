import { hasPermissionInList } from './moduleAccess.js';

const OVERSIGHT_ROLES = new Set(['md', 'ceo', 'admin']);

export function userMayViewFinanceTrialExceptionsClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk) || rk === 'finance_manager' || rk === 'cashier') return true;
  return (
    hasPermissionInList(permissions, 'cashier.desk.view') ||
    hasPermissionInList(permissions, 'accounting.desk.view') ||
    hasPermissionInList(permissions, 'audit.view') ||
    hasPermissionInList(permissions, 'finance.view') ||
    hasPermissionInList(permissions, 'reports.view')
  );
}

export function userMayViewFinanceTrialOversightClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk)) return true;
  return hasPermissionInList(permissions, 'audit.view');
}
