import { resolveDeskProfile, DESK_PROFILES } from './workspaceDeskNav.js';
import { TASK_QUEUE_TABS, isValidTaskQueueTab } from './workspaceTaskQueue.js';
import { canAccessModuleWithPermissions } from './moduleAccess.js';
import {
  WORKSPACE_CATEGORIES,
  workItemMatchesCategory,
} from './workspaceCategoryRegistry.js';

export { isValidTaskQueueTab };

/** App deep-links → module keys for permission gating. */
const APP_MODULE_BY_ID = {
  sales: 'sales',
  hr: 'hr',
  my_hr: 'my_profile_hr',
  manager: 'sales',
  operations: 'operations',
  production: 'operations',
  cashier: 'cashier_desk',
  monitoring: 'office',
  accounts: 'finance',
  accounting: 'accounting_desk',
  edit_approvals: 'edit_approvals',
  procurement: 'procurement',
  exec: 'office',
  reports: 'reports',
};

/** @typedef {'activity' | 'rooms' | 'action' | 'records' | 'apps'} WorkspaceZoneId */

export const WORKSPACE_ZONES = [
  { id: 'activity', label: 'Activity', shortLabel: 'Activity' },
  { id: 'rooms', label: 'Chat', shortLabel: 'Chat' },
  { id: 'action', label: 'Action', shortLabel: 'Action' },
  { id: 'records', label: 'Records', shortLabel: 'Records' },
  { id: 'apps', label: 'Apps', shortLabel: 'Apps' },
];

/**
 * Action tabs are the task-queue tabs — one source of truth so chip→tab
 * mapping and TaskQueuePanel never disagree on ids.
 */
export const ACTION_TABS = TASK_QUEUE_TABS;

export function isValidWorkspaceZone(zoneId) {
  return WORKSPACE_ZONES.some((z) => z.id === zoneId);
}

/** Role-scoped smart filter chips (not top-level nav) */
const CATEGORY_CHIP_IDS = ['sales', 'finance', 'inventory', 'operations', 'hr_admin', 'memos'];
const CATEGORY_CHIPS = CATEGORY_CHIP_IDS.map((id) => ({
  id,
  label: WORKSPACE_CATEGORIES[id]?.label || id,
}));

const ACTION_CHIPS_BY_PROFILE = {
  [DESK_PROFILES.staff]: [...CATEGORY_CHIPS],
  [DESK_PROFILES.branch]: [
    ...CATEGORY_CHIPS,
    { id: 'endorsements', label: 'Endorsements' },
    { id: 'team_requests', label: 'Team requests' },
    { id: 'incidents', label: 'Incidents' },
  ],
  [DESK_PROFILES.office]: [
    ...CATEGORY_CHIPS,
    { id: 'review', label: 'Review' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'conversions', label: 'Conversions' },
  ],
  [DESK_PROFILES.executive]: [
    ...CATEGORY_CHIPS,
    { id: 'high_value', label: 'High value' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'branch_pulse', label: 'Branch pulse' },
  ],
};

const DEFAULT_ZONE_BY_PROFILE = {
  [DESK_PROFILES.staff]: 'action',
  [DESK_PROFILES.branch]: 'activity',
  [DESK_PROFILES.office]: 'action',
  [DESK_PROFILES.executive]: 'activity',
};

const APPS_BY_PROFILE = {
  [DESK_PROFILES.staff]: [
    { id: 'sales', label: 'Sales', path: '/sales' },
    { id: 'my_hr', label: 'My HR', path: '/my-profile' },
    { id: 'operations', label: 'Operations', path: '/operations' },
    {
      id: 'production',
      label: 'Production',
      path: '/operations',
      description: 'Production and material operations',
    },
  ],
  [DESK_PROFILES.branch]: [
    { id: 'manager', label: 'Branch Command', path: '/manager' },
    { id: 'sales', label: 'Sales', path: '/sales' },
    { id: 'cashier', label: 'Cashier', path: '/cashier' },
    { id: 'operations', label: 'Operations', path: '/operations' },
    { id: 'monitoring', label: 'Monitoring', path: '/workspace/monitoring' },
  ],
  [DESK_PROFILES.office]: [
    { id: 'accounts', label: 'Accounts', path: '/accounts' },
    { id: 'accounting', label: 'Accounting', path: '/accounting' },
    { id: 'hr', label: 'HR', path: '/hr' },
    { id: 'edit_approvals', label: 'Edit Approvals', path: '/edit-approvals' },
    { id: 'procurement', label: 'Procurement', path: '/procurement' },
  ],
  [DESK_PROFILES.executive]: [
    { id: 'exec', label: 'Executive Centre', path: '/exec' },
    { id: 'manager', label: 'Branch view', path: '/manager' },
    { id: 'monitoring', label: 'Monitoring', path: '/workspace/monitoring' },
    { id: 'reports', label: 'Reports', path: '/reports' },
  ],
};

/**
 * @param {{ roleKey?: string; permissions?: string[] }} ctx
 */
export function getWorkspaceZoneConfig(ctx = {}) {
  const profile = resolveDeskProfile(ctx);
  const perms = ctx.permissions || [];
  const apps = (APPS_BY_PROFILE[profile] || APPS_BY_PROFILE[DESK_PROFILES.staff]).filter((app) => {
    const moduleKey = APP_MODULE_BY_ID[app.id];
    if (!moduleKey) return Boolean(app.path);
    return canAccessModuleWithPermissions(perms, moduleKey);
  });
  return {
    profile,
    zones: WORKSPACE_ZONES,
    defaultZone: DEFAULT_ZONE_BY_PROFILE[profile] || 'action',
    actionTabs: ACTION_TABS,
    actionChips: ACTION_CHIPS_BY_PROFILE[profile] || [],
    apps,
    title:
      profile === DESK_PROFILES.executive
        ? 'Executive Workspace'
        : profile === DESK_PROFILES.branch
          ? 'Branch Workspace'
          : profile === DESK_PROFILES.office
            ? 'Office Workspace'
            : 'My Workspace',
  };
}

/**
 * Map smart chips onto real task-queue tab ids (overdue has its own tab).
 * @param {string} chipId
 * @returns {string} task queue tab id
 */
export function actionChipToTaskTab(chipId) {
  const map = {
    endorsements: 'needs_action',
    team_requests: 'needs_action',
    incidents: 'needs_action',
    review: 'needs_action',
    approvals: 'needs_action',
    conversions: 'needs_action',
    high_value: 'needs_action',
    overdue: 'overdue',
    branch_pulse: 'waiting',
  };
  return map[chipId] || 'needs_action';
}

/**
 * Chip content filter — narrows the queue to items the chip is about,
 * on top of the tab filter. Conservative keyword predicates over
 * documentType / documentClass / status so chips actually filter.
 * @param {object} item
 * @param {string|null} chipId
 * @returns {boolean}
 */
export function workItemMatchesActionChip(item, chipId) {
  if (!chipId) return true;
  if (CATEGORY_CHIP_IDS.includes(chipId)) return workItemMatchesCategory(item, chipId);
  const docType = String(item?.documentType || '').toLowerCase();
  const docClass = String(item?.documentClass || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const priority = String(item?.priority || '').toLowerCase();
  const status = String(item?.status || '').toLowerCase();
  const hay = `${docType} ${docClass} ${title}`;
  const amount = [
    item?.amount,
    item?.amountNgn,
    item?.total,
    item?.totalNgn,
    item?.data?.amount,
    item?.data?.amountNgn,
    item?.payload?.amount,
    item?.payload?.amountNgn,
  ]
    .map(Number)
    .find(Number.isFinite);
  switch (chipId) {
    case 'endorsements':
      return Boolean(item?.requiresApproval) || /endorse/.test(hay);
    case 'team_requests':
      return docClass === 'request' || /request/.test(docType);
    case 'incidents':
      return /incident|damage|missing|offcut|discrepan/.test(hay);
    case 'review':
      return Boolean(item?.requiresResponse) || /review/.test(hay);
    case 'approvals':
      return Boolean(item?.requiresApproval);
    case 'conversions':
      return /expense|payment|material|procure/.test(hay);
    case 'high_value':
      return priority === 'urgent' || priority === 'high' || (Number.isFinite(amount) && amount >= 1000000);
    case 'overdue':
      return true; // tab itself is the overdue filter
    case 'branch_pulse':
      return Boolean(item?.requiresApproval) || /waiting|overdue|returned|blocked/.test(status);
    default:
      return true;
  }
}

/** Labels for the five workspace zones (shared by rail + mobile tabs). */
export function getWorkspaceZoneLabel(zoneId) {
  const zone = WORKSPACE_ZONES.find((z) => z.id === zoneId);
  return zone?.label || zoneId;
}
