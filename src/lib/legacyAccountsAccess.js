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

/** Cashier: Desk + receipts + movements + treasury (balances). No disbursements register or audit. */
const CASHIER_LEGACY_TABS = new Set(['desk', 'treasury', 'receipts', 'movements']);
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
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === ROLE_CASHIER && allowed.includes('desk')) return 'desk';
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
    return {
      to: fallback === 'treasury' ? '/accounts' : `/accounts?tab=${fallback}`,
      reason: 'tab_denied',
    };
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

export function isCashierRole(roleKey) {
  return String(roleKey || '').trim().toLowerCase() === ROLE_CASHIER;
}

/** Cashiers pay from Desk; Treasury tab is balances and statements only. */
export function treasuryTabShowsPayoutQueues(roleKey) {
  return !isCashierRole(roleKey);
}

/**
 * Resolve deep-link tab targets (including `requests` / `payments` aliases) to a tab the role may open.
 * Falls back to the role default when the requested tab is forbidden (e.g. cashier → desk not disbursements).
 * @param {string | undefined} tabOrAlias
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @returns {string | null}
 */
export function resolveAccountsNavigationTab(tabOrAlias, roleKey, permissions) {
  let tab = String(tabOrAlias || '').trim().toLowerCase();
  if (!tab) return null;
  if (tab === 'requests' || tab === 'payments') tab = 'disbursements';
  if (!LEGACY_ACCOUNT_TAB_IDS.includes(tab)) return null;
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (!allowed.length) return tab;
  if (allowed.includes(tab)) return tab;
  return getDefaultLegacyAccountTab(roleKey, permissions);
}

/** Cashier-friendly tab labels on Finance → PageTabs. */
export function legacyAccountTabLabelForRole(tabId, roleKey) {
  if (!isCashierRole(roleKey)) return null;
  const labels = {
    desk: 'My desk',
    treasury: 'Accounts & balances',
    receipts: 'Receipts',
    movements: 'Movements',
  };
  return labels[String(tabId || '').trim()] || null;
}
