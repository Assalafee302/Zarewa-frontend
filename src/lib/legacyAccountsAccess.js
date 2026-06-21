/**
 * Phase 10 — legacy `/accounts` route and tab RBAC (client).
 * Keep in sync with server/legacyAccountsAccess.js.
 */
import { hasPermissionInList } from './moduleAccess.js';

export const LEGACY_ACCOUNT_TAB_IDS = ['desk', 'treasury', 'receipts', 'movements', 'disbursements', 'audit'];

/** Merged treasury + desk surface — keep `desk` as the canonical tab id. */
export const FINANCE_DESK_TAB_ID = 'desk';
export const FINANCE_DESK_TAB_LABEL = 'Finance desk';

const ROLE_BRANCH_MANAGER = 'sales_manager';
const ROLE_CASHIER = 'cashier';
const ROLE_ACCOUNTANT = 'finance_manager';
const OVERSIGHT_ROLES = new Set(['admin', 'md']);

/** Cashier: Finance desk + receipts + movements. */
const CASHIER_LEGACY_TABS = new Set(['desk', 'receipts', 'movements']);
/** Accountant — Finance desk replaces legacy Treasury tab. */
const ACCOUNTANT_LEGACY_TABS = new Set(['desk', 'receipts', 'movements', 'disbursements', 'audit']);

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

function withoutRetiredTreasuryTab(tabs) {
  return tabs.filter((t) => t !== 'treasury');
}

/**
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @returns {string[]}
 */
export function getAllowedLegacyAccountTabs(roleKey, permissions) {
  if (hasPermissionInList(permissions, '*')) {
    return withoutRetiredTreasuryTab([...LEGACY_ACCOUNT_TAB_IDS]);
  }
  const rk = String(roleKey || '').trim().toLowerCase();
  if (OVERSIGHT_ROLES.has(rk)) return withoutRetiredTreasuryTab([...LEGACY_ACCOUNT_TAB_IDS]);
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
    return ['desk', 'receipts', 'disbursements'];
  }
  return [];
}

/**
 * Default Finance tab when `/accounts` has no `?tab=` — land on Finance desk.
 * @param {string | undefined} roleKey
 * @param {string[] | undefined} permissions
 * @returns {string}
 */
export function getDefaultLegacyAccountTab(roleKey, permissions) {
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (allowed.includes(FINANCE_DESK_TAB_ID)) return FINANCE_DESK_TAB_ID;
  return allowed[0] || FINANCE_DESK_TAB_ID;
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
  const normalizedTab = tab === 'treasury' ? FINANCE_DESK_TAB_ID : tab;
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (allowed.includes(normalizedTab) || tab === 'treasury') return null;
  if (rk === ROLE_ACCOUNTANT) return { to: '/accounting', reason: 'tab_denied' };
  const fallback = getDefaultLegacyAccountTab(roleKey, permissions);
  return {
    to: `/accounts?tab=${encodeURIComponent(fallback)}`,
    reason: 'tab_denied',
  };
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

/** @deprecated Treasury tab retired; supervisors see payout actions on Finance desk. */
export function treasuryTabShowsPayoutQueues(roleKey) {
  return !isCashierRole(roleKey);
}

/** Legacy Treasury tab retired — deep links resolve to Finance desk. */
export function resolveAccountsNavigationTab(tabOrAlias, roleKey, permissions) {
  let tab = String(tabOrAlias || '').trim().toLowerCase();
  if (!tab) return null;
  if (tab === 'requests' || tab === 'payments') tab = 'disbursements';
  if (tab === 'treasury') tab = FINANCE_DESK_TAB_ID;
  if (!LEGACY_ACCOUNT_TAB_IDS.includes(tab)) return null;
  const allowed = getAllowedLegacyAccountTabs(roleKey, permissions);
  if (!allowed.length) return tab;
  if (allowed.includes(tab)) return tab;
  return getDefaultLegacyAccountTab(roleKey, permissions);
}

/** Role-aware tab labels on Finance → PageTabs. */
export function legacyAccountTabLabelForRole(tabId, roleKey) {
  const tab = String(tabId || '').trim();
  if (tab === FINANCE_DESK_TAB_ID) return FINANCE_DESK_TAB_LABEL;
  if (isCashierRole(roleKey)) {
    const labels = {
      receipts: 'Receipts',
      movements: 'Movements',
    };
    return labels[tab] || null;
  }
  return null;
}
