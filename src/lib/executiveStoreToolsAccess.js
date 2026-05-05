import { hasPermissionInList } from './moduleAccess.js';

/** Roles that should see executive shortcuts to production / stock tools (with matching permissions below). */
const EXEC_STORE_SHORTCUT_ROLES = new Set(['admin', 'md', 'sales_manager']);

/**
 * Branch manager, MD, or administrator (or wildcard permission).
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function canSeeExecutiveStoreRoleShortcut(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const r = String(roleKey || '').toLowerCase();
  return EXEC_STORE_SHORTCUT_ROLES.has(r);
}

/**
 * Open production line / run log / completion corrections (API still enforces production.*).
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function canSeeExecutiveProductionEditShortcut(roleKey, permissions) {
  if (!canSeeExecutiveStoreRoleShortcut(roleKey, permissions)) return false;
  return (
    hasPermissionInList(permissions, 'production.manage') ||
    hasPermissionInList(permissions, 'production.release') ||
    hasPermissionInList(permissions, 'operations.manage')
  );
}

/**
 * Open stock management / adjustment entry points (API still enforces inventory.*).
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function canSeeExecutiveInventoryEditShortcut(roleKey, permissions) {
  if (!canSeeExecutiveStoreRoleShortcut(roleKey, permissions)) return false;
  return (
    hasPermissionInList(permissions, 'inventory.adjust') || hasPermissionInList(permissions, 'inventory.receive')
  );
}
