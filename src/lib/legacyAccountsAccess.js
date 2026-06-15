/**
 * Phase 10 — legacy `/accounts` route and tab RBAC (client).
 * Keep in sync with server/legacyAccountsAccess.js.
 */
import { hasPermissionInList } from './moduleAccess.js';

export const LEGACY_ACCOUNT_TAB_IDS = ['desk', 'treasury', 'receipts', 'movements', 'disbursements', 'audit'];

const ROLE_BRANCH_MANAGER = 'sales_manager';
const ROLE_CASHIER = 'cashier';
const ROLE_ACCOUNTANT = 'finance_manager';
const OVERSIGHT_ROLES = new Set(['admin', 'md']);

/** Branch cashier daily work queues — merged from former Cashier Desk. */
const CASHIER_LEGACY_TABS = new Set(['desk', 'treasury', 'receipts', 'movements', 'disbursements']);
const ACCOUNTANT_LEGACY_TABS = new Set(['treasury', 'receipts', 'movements', 'disbursements', 'audit']);

/**
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 */
export function userMayAccessLegacyAccountsRoute(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return true;
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk)) return true;
  if (rk === ROLE_BRANCH_MANAGER) return false;
  if (rk === ROLE_CASHIER) {
    return (
      hasPermissionInList(permissions, 'cashier.desk.view') ||
      hasPermissionInList(permissions, 'finance.pay') ||
      hasPermissionInList(permissions, 'treasury.manage') ||
      hasPermissionInList(permissions, 'receipts.post')
    );
  }
  if (rk === ROLE_ACCOUNTANT) {
    return (
      hasPermissionInList(permissions, 'accounting.desk.view') ||
      hasPermissionInList(permissions, 'accounting.reconciliation.view') ||
      hasPermissionInList(permissions, 'finance.view')
    );
  }
  if (hasPermissionInList(permissions, 'finance.view')) return true;
  return false;
}

/**
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @returns {string[]}
 */
export function getAllowedLegacyAccountTabs(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) return [...LEGACY_ACCOUNT_TAB_IDS];
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk)) return [...LEGACY_ACCOUNT_TAB_IDS];
  if (rk === ROLE_BRANCH_MANAGER) return [];
  if (rk === ROLE_CASHIER) {
    return LEGACY_ACCOUNT_TAB_IDS.filter((t) => CASHIER_LEGACY_TABS.has(t));
  }
  if (rk === ROLE_ACCOUNTANT) {
    return LEGACY_ACCOUNT_TAB_IDS.filter((t) => ACCOUNTANT_LEGACY_TABS.has(t));
  }
  if (
    hasPermissionInList(permissions, 'accounting.gl.view') ||
    hasPermissionInList(permissions, 'accounting.reconciliation.view')
  ) {
    return LEGACY_ACCOUNT_TAB_IDS.filter((t) => ACCOUNTANT_LEGACY_TABS.has(t));
  }
  if (hasPermissionInList(permissions, 'finance.view')) {
    return ['treasury', 'receipts', 'disbursements'];
  }
  return [];
}

/**
 * Default Finance tab when `/accounts` has no `?tab=` — cashiers land on Desk.
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @returns {string}
 */
export function getDefaultLegacyAccountTab(roleKey, permissions) {
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (allowed.includes('treasury')) return 'treasury';
  return allowed[0] || 'treasury';
}

/**
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @param {string} [tabId]
 * @returns {{ to: string; reason: string } | null}
 */
export function resolveLegacyAccountsRedirect(roleKey, permissions, tabId = '') {
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === ROLE_BRANCH_MANAGER) return { to: '/manager', reason: 'branch_manager' };
  if (!userMayAccessLegacyAccountsRoute(roleKey, permissions)) {
    if (rk === ROLE_CASHIER) return { to: '/accounts', reason: 'cashier_finance' };
    if (rk === ROLE_ACCOUNTANT) return { to: '/accounting', reason: 'accounting_desk' };
    return { to: '/', reason: 'denied' };
  }
  const tab = String(tabId || '').trim().toLowerCase();
  if (!tab) return null;
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (allowed.includes(tab)) return null;
  if (rk === ROLE_CASHIER) {
    const fallback = getDefaultLegacyAccountTab(roleKey, permissions);
    return { to: `/accounts?tab=${fallback}`, reason: 'tab_denied' };
  }
  if (rk === ROLE_ACCOUNTANT) return { to: '/accounting', reason: 'tab_denied' };
  const fallback = allowed[0] || 'treasury';
  return { to: fallback === 'treasury' ? '/accounts' : `/accounts?tab=${fallback}`, reason: 'tab_denied' };
}

/** Sidebar Finance (`/accounts`) — branch managers use Manager Dashboard; cashiers use Finance Desk tab. */
export function userMaySeeLegacyAccountsNav(roleKey, permissions) {
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === ROLE_BRANCH_MANAGER) return false;
  return userMayAccessLegacyAccountsRoute(roleKey, permissions);
}
