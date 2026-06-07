import { canAccessModuleWithPermissions } from './moduleAccess.js';

/** Canonical role keys (aligned with server auth). */
export const WORKSPACE_ROLE_KEYS = [
  'admin',
  'md',
  'finance_manager',
  'sales_manager',
  'sales_staff',
  'cashier',
  'operations_officer',
  'hr_admin',
  'gmhr',
];

const LEGACY_DEPARTMENT_TO_ROLE = {
  general: 'sales_staff',
  customer: 'sales_staff',
  sales: 'sales_staff',
  inventory: 'operations_officer',
  production: 'operations_officer',
  storekeeper: 'operations_officer',
  store_keeper: 'operations_officer',
  purchase: 'md',
  finance: 'finance_manager',
  reports: 'sales_staff',
  it: 'admin',
  leadership: 'md',
  hr: 'sales_staff',
};

/** @deprecated Kept for bootstrap compatibility — values are role keys or legacy department ids. */
export const WORKSPACE_DEPARTMENT_IDS = [...WORKSPACE_ROLE_KEYS, ...Object.keys(LEGACY_DEPARTMENT_TO_ROLE)];

export const WORKSPACE_DEPARTMENT_LABELS = {
  admin: 'Administrator',
  md: 'Managing director',
  finance_manager: 'Finance manager',
  sales_manager: 'Branch manager',
  sales_staff: 'Sales officer',
  cashier: 'Cashier',
  operations_officer: 'Operations officer',
  hr_admin: 'HR / Admin',
  gmhr: 'GM HR',
  general: 'General / cross-functional',
  customer: 'Customer relations',
  sales: 'Sales',
  inventory: 'Store & inventory',
  production: 'Production floor',
  storekeeper: 'Storekeeper',
  store_keeper: 'Storekeeper',
  purchase: 'Purchase & procurement',
  finance: 'Finance',
  reports: 'Reports & analytics',
  it: 'IT & platform',
};

export function normalizeWorkspaceDepartmentId(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (WORKSPACE_ROLE_KEYS.includes(s)) return s;
  if (LEGACY_DEPARTMENT_TO_ROLE[s]) return LEGACY_DEPARTMENT_TO_ROLE[s];
  return 'sales_staff';
}

const DEFAULT_HOME_BY_ROLE = {
  admin: '/settings',
  md: '/exec',
  ceo: '/exec',
  hr_admin: '/hr',
  gmhr: '/hr',
  finance_manager: '/accounting',
  sales_manager: '/manager',
  sales_staff: '/',
  cashier: '/cashier',
  operations_officer: '/operations',
};

export function defaultHomePathForDepartment(deptId) {
  const id = normalizeWorkspaceDepartmentId(deptId);
  return DEFAULT_HOME_BY_ROLE[id] || '/';
}

/** Map a route path to a sidebar module key (for guards and shortcuts). */
export function pathToModuleKey(pathname) {
  const p = String(pathname || '').replace(/\/$/, '') || '/';
  if (p === '/') return null;
  if (p === '/office' || p.startsWith('/office/')) return 'office';
  if (p === '/manager') return 'sales';
  if (p === '/edit-approvals') return 'edit_approvals';
  if (p === '/sales' || p.startsWith('/customers')) return 'sales';
  if (p === '/procurement' || p.startsWith('/procurement/')) return 'procurement';
  if (p === '/operations') return 'operations';
  if (p === '/accounts') return 'finance';
  if (p === '/cashier') return 'cashier_desk';
  if (p === '/accounting' || p.startsWith('/accounting/')) return 'accounting_desk';
  if (p === '/reports') return 'reports';
  if (p === '/settings' || p.startsWith('/settings/')) return 'settings';
  if (p === '/my-profile' || p.startsWith('/my-profile/')) return 'my_profile_hr';
  if (p === '/team-hr' || p.startsWith('/team-hr/')) return 'team_hr';
  if (p === '/executive-hr' || p.startsWith('/executive-hr/')) return 'executive_hr';
  if (p === '/hr/executive' || p.startsWith('/hr/executive/')) return 'executive_hr';
  if (p === '/hr' || p.startsWith('/hr/')) return 'hr';
  return null;
}

/**
 * After login, send the user to their role home if their permissions allow it.
 * @param {{ department?: string; roleKey?: string } | null | undefined} user
 * @param {string[]} permissions
 */
export function resolvePostLoginPath(user, permissions) {
  if (canAccessModuleWithPermissions(permissions, 'office')) {
    return '/office';
  }
  const roleKey = String(user?.roleKey || '').trim().toLowerCase();
  if (roleKey === 'md' || roleKey === 'ceo') {
    const mod = pathToModuleKey('/exec');
    if (mod && !canAccessModuleWithPermissions(permissions, mod)) return '/';
    return '/exec';
  }
  if (roleKey === 'sales_manager') {
    const mod = pathToModuleKey('/manager');
    if (mod && !canAccessModuleWithPermissions(permissions, mod)) return '/';
    return '/manager';
  }
  const target = defaultHomePathForDepartment(user?.roleKey || user?.department);
  if (target === '/') return '/';
  const mod = pathToModuleKey(target);
  if (mod && !canAccessModuleWithPermissions(permissions, mod)) return '/';
  return target;
}

export function filterWorkspaceLinksByPermissions(links, permissions) {
  if (!Array.isArray(links)) return [];
  return links.filter((link) => {
    const mod = pathToModuleKey(link.to);
    if (!mod) return true;
    return canAccessModuleWithPermissions(permissions, mod);
  });
}

/**
 * Static copy for Settings team guide + dashboard shortcuts (no React icons).
 * @type {Array<{
 *   id: string;
 *   title: string;
 *   primary: string;
 *   bullets: string[];
 *   links: Array<{ to: string; label: string; state?: object }>;
 * }>}
 */
export const WORKSPACE_GUIDE_ENTRIES = [
  {
    id: 'customer',
    title: 'Customer relations',
    primary:
      'Owns customer relationships from first contact through post-sale service — accurate profiles and responsive follow-up.',
    bullets: [
      'Profiling: create and maintain customer records, terms, and tiers.',
      'Quotations: pricing and status tracking (tight coupling with Sales workspace).',
      'Interaction: inquiries, complaints, follow-ups (see customer dashboard timeline & notes).',
      'Orders: align approved quotes with fulfillment via inventory and production.',
    ],
    links: [
      { to: '/sales', label: 'Sales' },
      { to: '/sales', label: 'Customers (Sales → Customers tab)', state: { focusSalesTab: 'customers' } },
    ],
  },
  {
    id: 'sales',
    title: 'Sales',
    primary:
      'Drives revenue — pipeline discipline, order execution, collections, and performance visibility.',
    bullets: [
      'Leads & pipeline: qualify prospects and register them as customers when ready.',
      'Sales orders: quotations, cutting lists, and dispatch handoff.',
      'Payments: receipts posted against quotations; supports partial and full settlement.',
      'Reporting: trends and KPIs via Reports and the main dashboard.',
    ],
    links: [
      { to: '/sales', label: 'Sales' },
      { to: '/reports', label: 'Reports' },
    ],
  },
  {
    id: 'inventory',
    title: 'Store & inventory',
    primary:
      'Physical stock — GRN from approved POs, coil traceability, transfers, adjustments, and alerts.',
    bullets: [
      'Reception: Store GRN with coil / weight / location; validates against PO open qty.',
      'Movement: store → production transfers and finished-goods back to sellable stock.',
      'Reporting: low stock strip, live levels in Reports.',
    ],
    links: [{ to: '/operations', label: 'Operations' }],
  },
  {
    id: 'production',
    title: 'Production floor',
    primary:
      'Converts raw materials to finished goods — planning, consumption visibility, quality, and yield.',
    bullets: [
      'Planning: production queue and job IDs linked to material transfers.',
      'Consumption: raw issue from store (WIP tracked on the Production page).',
      'Output: finished goods receipt into FG SKUs for sales.',
      'Efficiency: conversion and scrap narratives on dashboard / future dedicated reports.',
    ],
    links: [{ to: '/operations', label: 'Production' }],
  },
  {
    id: 'purchase',
    title: 'Procurement (executive-led)',
    primary:
      'Sourcing and supplier performance — PO lifecycle, invoices on file, coordination with store GRN. In this deployment procurement authority sits with the managing director role.',
    bullets: [
      'Suppliers: directory and transport agents (Purchases / Transportation tabs).',
      'Purchase orders: multi-line POs, totals, Pending → Approved / Rejected; assign transport (on loading), then post to in transit (optional treasury-linked haulage) before GRN.',
      'Quantities finalized at store receipt (GRN).',
      'Supplier payables and payments: Procurement → Payments tab (same module as POs).',
    ],
    links: [{ to: '/procurement', label: 'Procurement' }],
  },
  {
    id: 'finance',
    title: 'Finance',
    primary:
      'Liquidity, AR/AP, expenses, approvals, movements, audit and bank reconciliation.',
    bullets: [
      'Receivables: summary from Finance sidebar; detail in Sales receipts / customer dashboards.',
      'Supplier AP: procurement posts payments; Finance uses Treasury and Payments for cash movement.',
      'Payments tab: posted treasury debits (refunds, requests, purchases, haulage) plus request pipeline.',
      'Control: reconciliation lines, audit checklist, reporting exports (stubs).',
    ],
    links: [{ to: '/accounts', label: 'Finance & accounts' }],
  },
  {
    id: 'reports',
    title: 'Reports & analytics',
    primary:
      'Cross-cutting insight — sales, inventory movement log, financial previews, exports.',
    bullets: [
      'Sales and receivables snapshots with date filters (demo scope).',
      'Inventory overview and live movement log from Production / Procurement activity.',
      'Financial packs (P&L, cash flow) when the ledger API is connected.',
      'Production efficiency packs as metrics mature.',
    ],
    links: [{ to: '/reports', label: 'Reports' }],
  },
  {
    id: 'it',
    title: 'IT & support',
    primary:
      'Platform health, user enablement, security, and access governance.',
    bullets: [
      'Maintenance: uptime, releases, and environment hygiene (outside this UI demo).',
      'Training & support: onboarding staff on each module above.',
      'Security: authentication, roles, and audit when backend auth ships.',
      'Demo role below previews future per-module visibility.',
    ],
    links: [{ to: '/settings', label: 'Settings (this page)' }],
  },
];

export function getWorkspaceGuideEntry(departmentId) {
  const id = normalizeWorkspaceDepartmentId(departmentId);
  return WORKSPACE_GUIDE_ENTRIES.find((e) => e.id === id) ?? null;
}
