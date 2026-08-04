/**
 * OT workspace access helpers.
 */
export const OT_PERMS = ['ot.request', 'ot.approve', 'ot.pay', 'ot.view_branch'];

export function userMayAccessOtWorkspace(hasPermission) {
  if (typeof hasPermission !== 'function') return false;
  if (hasPermission('*')) return true;
  return OT_PERMS.some((p) => hasPermission(p));
}

/** Sub-views on /overtime */
export const OT_HUB_TABS = [
  { id: 'overview', label: 'Overview', perms: OT_PERMS },
  { id: 'requests', label: 'Raise request', perms: ['ot.request'] },
  { id: 'approvals', label: 'Approvals', perms: ['ot.approve'] },
  { id: 'pay', label: 'Mark paid', perms: ['ot.pay'] },
  { id: 'track', label: 'Track all', perms: OT_PERMS },
];

export function normalizeOtHubTab(raw, hasPermission) {
  const t = String(raw || 'overview')
    .trim()
    .toLowerCase();
  const allowed = OT_HUB_TABS.filter(
    (tab) =>
      hasPermission?.('*') || tab.perms.some((p) => hasPermission?.(p))
  ).map((tab) => tab.id);
  if (allowed.includes(t)) return t;
  return allowed[0] || 'overview';
}

/**
 * Build KPI cards from OT request rows.
 * @param {Array<object>} rows
 */
export function buildOtIntelFromRows(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const by = (st) => list.filter((r) => String(r.status) === st);
  const sum = (arr) => arr.reduce((s, r) => s + (Math.round(Number(r.totalPayableNgn) || 0)), 0);

  const draft = by('draft');
  const pending = by('pending_bm_approval');
  const approved = by('approved_by_bm');
  const paid = by('paid');
  const rejected = by('rejected_by_bm');

  const workTypeCounts = {};
  for (const r of list) {
    const w = String(r.workType || 'other');
    workTypeCounts[w] = (workTypeCounts[w] || 0) + 1;
  }

  return {
    total: list.length,
    draftCount: draft.length,
    pendingCount: pending.length,
    approvedCount: approved.length,
    paidCount: paid.length,
    rejectedCount: rejected.length,
    payableQueueNgn: sum(approved),
    paidNgn: sum(paid),
    workTypeCounts,
    // Open pipeline for store + BM + cash
    openPipeline: draft.length + pending.length + approved.length,
  };
}
