import { normalizeRoleKey } from './departmentWorkspace.js';
import { canAccessModuleWithPermissions } from './moduleAccess.js';

/** Desk profile keys */
export const DESK_PROFILES = {
  staff: 'staff',
  branch: 'branch',
  office: 'office',
  executive: 'executive',
};

/**
 * @param {{ roleKey?: string; permissions?: string[] }} ctx
 */
export function resolveDeskProfile(ctx = {}) {
  const roleKey = normalizeRoleKey(ctx.roleKey);
  const perms = ctx.permissions || [];

  if (roleKey === 'md' || roleKey === 'ceo' || roleKey === 'chairman') {
    return DESK_PROFILES.executive;
  }
  if (
    roleKey === 'admin' ||
    roleKey === 'finance_manager' ||
    roleKey === 'cashier' ||
    roleKey === 'hr_admin' ||
    roleKey === 'gmhr' ||
    roleKey === 'operations_officer'
  ) {
    return DESK_PROFILES.office;
  }
  if (roleKey === 'sales_manager' || roleKey === 'branch_manager') {
    return DESK_PROFILES.branch;
  }
  if (canAccessModuleWithPermissions(perms, 'office') && roleKey !== 'sales_staff') {
    return DESK_PROFILES.office;
  }
  return DESK_PROFILES.staff;
}

/**
 * @typedef {{ id: string; label: string; section?: string; requires?: (ctx: object) => boolean }} DeskNavItem
 */

/** @type {Record<string, { title: string; items: DeskNavItem[] }>} */
export const DESK_NAV_BY_PROFILE = {
  [DESK_PROFILES.staff]: {
    title: 'My Desk',
    items: [
      { id: 'desk', label: 'My Desk' },
      { id: 'create', label: 'Create Office Record' },
      { id: 'my_requests', label: 'My Requests' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'notices', label: 'Official Notices' },
      { id: 'forum', label: 'Office Forum' },
      { id: 'search', label: 'Search' },
    ],
  },
  [DESK_PROFILES.branch]: {
    title: 'Branch Desk',
    items: [
      { id: 'desk', label: 'Branch Desk' },
      { id: 'today', label: "Today's Work" },
      { id: 'endorsements', label: 'Endorsements' },
      { id: 'team_requests', label: 'Team Requests' },
      { id: 'expense_conversions', label: 'Expense Conversions' },
      { id: 'incidents', label: 'Incidents' },
      { id: 'notices', label: 'Official Notices' },
      { id: 'branch_forum', label: 'Branch Forum' },
      { id: 'filing', label: 'Filing' },
      { id: 'monitoring', label: 'Monitoring' },
      { id: 'search', label: 'Search' },
    ],
  },
  [DESK_PROFILES.office]: {
    title: 'Office Desk',
    items: [
      { id: 'desk', label: 'Office Desk' },
      { id: 'review', label: 'Review Queue' },
      { id: 'approvals', label: 'Approvals' },
      { id: 'expense_conversions', label: 'Expense Conversions' },
      { id: 'filing', label: 'Filing' },
      { id: 'notices', label: 'Official Notices' },
      { id: 'forum', label: 'Office Forum' },
      { id: 'monitoring', label: 'Monitoring' },
      { id: 'records', label: 'Records' },
      { id: 'search', label: 'Search' },
    ],
  },
  [DESK_PROFILES.executive]: {
    title: 'Executive Desk',
    items: [
      { id: 'desk', label: 'Executive Desk' },
      { id: 'high_value', label: 'High-value Approvals' },
      { id: 'branch_monitoring', label: 'Branch Monitoring' },
      { id: 'notices', label: 'Official Notices' },
      { id: 'contributions', label: 'Branch Contributions' },
      { id: 'overdue', label: 'Overdue Items' },
      { id: 'expense_oversight', label: 'Expense Oversight' },
      { id: 'records', label: 'Records' },
      { id: 'search', label: 'Search' },
    ],
  },
};

/**
 * @param {{ roleKey?: string; permissions?: string[] }} ctx
 * @returns {{ profile: string; title: string; items: DeskNavItem[] }}
 */
export function getWorkspaceDeskNav(ctx = {}) {
  const profile = resolveDeskProfile(ctx);
  const block = DESK_NAV_BY_PROFILE[profile] || DESK_NAV_BY_PROFILE[DESK_PROFILES.staff];
  const items = block.items.filter((item) => {
    if (!item.requires) return true;
    return item.requires(ctx);
  });
  return { profile, title: block.title, items };
}

export function deskSectionLabel(sectionId) {
  const all = Object.values(DESK_NAV_BY_PROFILE).flatMap((b) => b.items);
  return all.find((i) => i.id === sectionId)?.label || sectionId;
}
