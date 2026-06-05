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

/** AP1c-0 dry-run API — HoA, MD, admin, finance_manager, accounting reconciliation. */
export function userMayViewAp1cDryRunClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk) || rk === 'finance_manager') return true;
  if (
    hasPermissionInList(permissions, 'accounting.desk.view') ||
    hasPermissionInList(permissions, 'accounting.reconciliation.view') ||
    hasPermissionInList(permissions, 'finance.view') ||
    hasPermissionInList(permissions, 'audit.view')
  ) {
    return true;
  }
  return false;
}

/**
 * AP2a supplier / GRN / payables diagnostics — mirrors server userMayViewAp2SupplierDiagnostics.
 * Cashier-only roles excluded; procurement.view allowed for read-only procurement card.
 */
export function userMayViewAp2SupplierDiagnosticsClient(roleKey, permissions) {
  if (userMayViewAp1cDryRunClient(roleKey, permissions)) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === 'cashier') return false;
  if (hasPermissionInList(permissions, 'procurement.view')) return true;
  if (
    hasPermissionInList(permissions, 'finance.view') ||
    hasPermissionInList(permissions, 'accounting.reconciliation.view')
  ) {
    return true;
  }
  return false;
}

export function userMayViewAp2ApRebuildPreviewClient(roleKey, permissions) {
  return userMayViewAp2SupplierDiagnosticsClient(roleKey, permissions);
}

/** Head of Accounts / finance_manager — not cashier-only. */
export function userMayApplyAp2ApRebuildClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === 'cashier') return false;
  if (OVERSIGHT_ROLES.has(rk) || rk === 'finance_manager') return true;
  if (
    hasPermissionInList(permissions, 'accounting.desk.view') ||
    hasPermissionInList(permissions, 'accounting.reconciliation.view')
  ) {
    return true;
  }
  return false;
}
