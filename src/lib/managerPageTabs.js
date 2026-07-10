/** Page-level tabs for Branch Manager Command Center. */

export const MANAGER_PAGE_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'intelligence', label: 'Business Intelligence' },
  { id: 'operations', label: 'Branch Operations' },
  { id: 'performance', label: 'Performance' },
];

export const MANAGER_PAGE_TAB_IDS = MANAGER_PAGE_TABS.map((t) => t.id);

/** Priority Action Center primary views (attendance lives on Team HR). */
export const MANAGER_PAC_TABS = [
  { key: 'attention', label: 'Needs approval', description: 'Unified queue — filter by kind' },
  { key: 'credit', label: 'Credit exceptions', description: 'Delivery on credit awaiting approval' },
  { key: 'stock', label: 'Stock register', description: 'Month-end count alignment' },
];

/**
 * @param {string | null | undefined} raw
 * @returns {'today' | 'intelligence' | 'operations' | 'performance'}
 */
export function normalizeManagerPageTab(raw) {
  const k = String(raw || '').trim().toLowerCase();
  if (MANAGER_PAGE_TAB_IDS.includes(k)) return /** @type {any} */ (k);
  if (k === 'bi' || k === 'intel') return 'intelligence';
  if (k === 'ops') return 'operations';
  if (k === 'pulse' || k === 'perf') return 'performance';
  return 'today';
}

/** Team HR path for daily attendance roll. */
export const TEAM_HR_ATTENDANCE_PATH = '/team-hr/time-absence?tab=attendance';
