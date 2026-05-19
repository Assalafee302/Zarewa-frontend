import { hasPermissionInList } from './moduleAccess.js';

/** Roles that may see manager-dashboard shortcuts to production / stock (permission check is primary). */
const EXEC_STORE_SHORTCUT_ROLES = new Set(['admin', 'md', 'sales_manager', 'operations_officer']);

function hasStoreFloorPermissions(permissions) {
  return (
    hasPermissionInList(permissions, 'production.manage') ||
    hasPermissionInList(permissions, 'operations.manage') ||
    hasPermissionInList(permissions, 'inventory.receive') ||
    hasPermissionInList(permissions, 'inventory.adjust')
  );
}

/**
 * Branch manager, MD, administrator, or store/production staff with matching permissions.
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function canSeeExecutiveStoreRoleShortcut(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  if (hasStoreFloorPermissions(permissions)) return true;
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
