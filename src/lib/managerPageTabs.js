/** Page-level tabs for Branch Manager Command Center. */

export const MANAGER_PAGE_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'branch', label: 'Branch' },
  { id: 'spend', label: 'Expenses' },
];

export const MANAGER_PAGE_TAB_IDS = MANAGER_PAGE_TABS.map((t) => t.id);

const BRANCH_TAB_ALIASES = new Set([
  'branch',
  'intelligence',
  'insights',
  'operations',
  'performance',
  'bi',
  'intel',
  'ops',
  'pulse',
  'perf',
]);

/** Priority Action Center primary views (attendance lives on Team HR). */
export const MANAGER_PAC_TABS = [
  { key: 'attention', label: 'Needs approval', description: 'Unified queue — filter by kind' },
  { key: 'credit', label: 'Credit exceptions', description: 'Delivery on credit awaiting approval' },
  { key: 'stock', label: 'Stock register', description: 'Month-end count alignment' },
  { key: 'issues', label: 'Issues', description: 'Open plant fault work orders' },
];

/**
 * @param {string | null | undefined} raw
 * @returns {'today' | 'approvals' | 'branch' | 'spend'}
 */
export function normalizeManagerPageTab(raw) {
  const k = String(raw || '').trim().toLowerCase();
  if (k === 'pac' || k === 'queue' || k === 'inbox' || k === 'approval') return 'approvals';
  if (BRANCH_TAB_ALIASES.has(k)) return 'branch';
  if (MANAGER_PAGE_TAB_IDS.includes(k)) return /** @type {any} */ (k);
  if (k === 'expenses' || k === 'expense') return 'spend';
  return 'today';
}

/** Team HR path for daily attendance roll. */
export const TEAM_HR_ATTENDANCE_PATH = '/team-hr/time-absence?tab=attendance';
