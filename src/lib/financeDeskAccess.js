/**
 * Phase B — Cashier Desk vs Accounting Desk visibility (client).
 * Compatibility: legacy roles keep broader access until Phase B3 RBAC tightening.
 */
import { hasPermissionInList } from './moduleAccess.js';

export const FINANCE_DESK_PERMISSIONS = {
  cashierDeskView: 'cashier.desk.view',
  cashierReceiptsConfirm: 'cashier.receipts.confirm',
  accountingDeskView: 'accounting.desk.view',
  accountingReconciliationView: 'accounting.reconciliation.view',
  accountingGlView: 'accounting.gl.view',
};

const ACCOUNTING_DESK_ROLE_KEYS = new Set(['admin', 'md', 'finance_manager']);
const CASHIER_DESK_ROLE_KEYS = new Set(['cashier']);

/** Head of Accounts / company accounting desk (reconciliation, GL, month-end). */
export function userMayViewAccountingDeskClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (hasPermissionInList(permissions, FINANCE_DESK_PERMISSIONS.accountingDeskView)) return true;
  if (ACCOUNTING_DESK_ROLE_KEYS.has(rk)) return true;
  if (
    hasPermissionInList(permissions, 'finance.view') &&
    hasPermissionInList(permissions, 'reports.view') &&
    !CASHIER_DESK_ROLE_KEYS.has(rk)
  ) {
    return true;
  }
  return false;
}

/**
 * Branch cashier / treasury desk (receipt confirmation, payouts).
 */
export function userMayViewCashierDeskClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (hasPermissionInList(permissions, FINANCE_DESK_PERMISSIONS.cashierDeskView)) return true;
  if (CASHIER_DESK_ROLE_KEYS.has(rk)) return true;
  if (
    hasPermissionInList(permissions, 'finance.pay') ||
    hasPermissionInList(permissions, 'treasury.manage') ||
    hasPermissionInList(permissions, 'receipts.post')
  ) {
    return true;
  }
  return false;
}

/** Reconciliation pack & GL pilot on Reports — accounting desk roles only (cashier excluded by role). */
export function userMayViewAccountingSectionsOnReportsClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (hasPermissionInList(permissions, FINANCE_DESK_PERMISSIONS.accountingReconciliationView)) return true;
  if (hasPermissionInList(permissions, FINANCE_DESK_PERMISSIONS.accountingGlView)) return true;
  return userMayViewAccountingDeskClient(roleKey, permissions);
}

/**
 * MD / executive oversight — may open Accounting Desk but must not post journals, lock periods, or edit registers.
 */
export function userIsAccountingExecutiveReadOnlyClient(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return false;
  if (!userMayViewAccountingDeskClient(roleKey, permissions)) return false;
  return !hasPermissionInList(permissions, 'finance.post');
}

/** Phase 10: legacy full-finance hat — MD/admin/accountant only; cashier and BM use desks. */
export function userHasLegacyFullFinanceDeskClient(roleKey, permissions) {
  const rk = String(roleKey || '').trim().toLowerCase();
  if (hasPermissionInList(permissions, '*')) return true;
  if (rk === 'sales_manager' || CASHIER_DESK_ROLE_KEYS.has(rk)) return false;
  return ACCOUNTING_DESK_ROLE_KEYS.has(rk);
}
