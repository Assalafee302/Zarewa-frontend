import {
  canAccessModuleWithPermissions,
  hasPermissionInList,
  userMayAccessSalesModule,
} from './moduleAccess';

/** Workspace domain keys served by `/api/workspace/{key}-snapshot`. */
export const WORKSPACE_DOMAIN_KEYS = ['sales', 'procurement', 'operations', 'finance'];

/**
 * Domains this user may open, ordered for background prefetch (primary desk first).
 * @param {string[]} permissions
 * @param {string} [roleKey]
 */
export function accessibleWorkspaceDomains(permissions, roleKey) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const rk = String(roleKey || '').trim().toLowerCase();
  const out = [];

  const push = (key) => {
    if (!out.includes(key)) out.push(key);
  };

  if (userMayAccessSalesModule(rk, perms)) push('sales');
  if (canAccessModuleWithPermissions(perms, 'procurement')) push('procurement');
  if (canAccessModuleWithPermissions(perms, 'operations')) push('operations');
  if (
    canAccessModuleWithPermissions(perms, 'finance') ||
    hasPermissionInList(perms, 'expenses.create')
  ) {
    push('finance');
  }

  /** Cashier / finance-heavy roles: finance before sales when both exist. */
  if (rk === 'cashier' || rk === 'accountant') {
    return ['finance', 'sales', 'operations', 'procurement'].filter((k) => out.includes(k));
  }
  if (rk === 'store' || rk === 'production' || rk === 'production_manager') {
    return ['operations', 'procurement', 'sales', 'finance'].filter((k) => out.includes(k));
  }
  if (rk === 'procurement' || rk === 'procurement_officer') {
    return ['procurement', 'operations', 'sales', 'finance'].filter((k) => out.includes(k));
  }

  return out;
}

/** Route path → domain keys worth warming before navigation. */
export function workspaceDomainsForPath(pathname) {
  const p = String(pathname || '');
  if (p.startsWith('/sales') || p.startsWith('/customers')) return ['sales'];
  if (p.startsWith('/procurement')) return ['procurement'];
  if (p.startsWith('/operations')) return ['operations'];
  if (p.startsWith('/accounts') || p.startsWith('/cashier') || p.startsWith('/accounting')) {
    return ['finance', 'sales'];
  }
  if (p.startsWith('/reports')) return ['finance', 'operations'];
  if (p.startsWith('/manager')) return ['finance', 'sales', 'operations'];
  return [];
}

/** Human labels for desk sync banners. */
export const WORKSPACE_DOMAIN_LABELS = {
  sales: 'sales register',
  finance: 'finance register',
  operations: 'operations & stock',
  procurement: 'procurement register',
};

/**
 * @param {string | string[]} domain
 */
export function workspaceDomainSyncLabel(domain) {
  const keys = (Array.isArray(domain) ? domain : [domain]).map((d) =>
    String(d || '').trim().toLowerCase()
  );
  if (keys.length === 1) {
    return WORKSPACE_DOMAIN_LABELS[keys[0]] || `${keys[0]} data`;
  }
  const labels = keys.map((k) => WORKSPACE_DOMAIN_LABELS[k] || k).filter(Boolean);
  return labels.length ? labels.join(' & ') : 'desk data';
}

/**
 * Infer domains already present in a cached/full bootstrap (skip redundant prefetch).
 * @param {object | null | undefined} snapshot
 * @returns {Set<string>}
 */
export function inferLoadedWorkspaceDomains(snapshot) {
  const loaded = new Set();
  if (!snapshot?.ok) return loaded;

  const deferred = new Set(
    Array.isArray(snapshot.bootstrapMeta?.deferredDeskArrays)
      ? snapshot.bootstrapMeta.deferredDeskArrays
      : []
  );

  if (!deferred.has('customers') && Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
    loaded.add('sales');
  }
  if (!deferred.has('expenses') && Array.isArray(snapshot.expenses) && snapshot.expenses.length > 0) {
    loaded.add('finance');
  }
  if (!deferred.has('coilLots') && Array.isArray(snapshot.coilLots) && snapshot.coilLots.length > 0) {
    loaded.add('operations');
  }
  if (
    Array.isArray(snapshot.suppliers) &&
    snapshot.suppliers.length > 0 &&
    Array.isArray(snapshot.purchaseOrders)
  ) {
    loaded.add('procurement');
  }

  return loaded;
}

/**
 * @param {object | null | undefined} snapshot
 * @param {string} domain
 */
export function snapshotHasUsableDomainData(snapshot, domain) {
  const key = String(domain || '').trim().toLowerCase();
  if (!snapshot?.ok) return false;
  switch (key) {
    case 'sales':
      return Array.isArray(snapshot.customers) && snapshot.customers.length > 0;
    case 'finance':
      return (
        (Array.isArray(snapshot.expenses) && snapshot.expenses.length > 0) ||
        (Array.isArray(snapshot.paymentRequests) && snapshot.paymentRequests.length > 0) ||
        (Array.isArray(snapshot.receipts) && snapshot.receipts.length > 0)
      );
    case 'operations':
      return (
        (Array.isArray(snapshot.coilLots) && snapshot.coilLots.length > 0) ||
        (Array.isArray(snapshot.productionJobCoils) && snapshot.productionJobCoils.length > 0)
      );
    case 'procurement':
      return Array.isArray(snapshot.suppliers);
    default:
      return false;
  }
}
