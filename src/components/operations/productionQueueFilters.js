/**
 * In-progress Register chips. `attention` is overdue or manager review — not "all jobs".
 */
export const PRODUCTION_ACTIVE_FILTERS = [
  'all',
  'coils_allocated',
  'no_coil',
  'running',
  'planned',
  'attention',
];

export function matchesProductionActiveFilter(row, filter) {
  if (filter === 'coils_allocated') return Boolean(row.hasCoilsAllocated);
  if (filter === 'no_coil') return Boolean(row.needsCoil);
  if (filter === 'running') return row.status === 'Running';
  if (filter === 'planned') return row.status === 'Planned';
  if (filter === 'attention') return Boolean(row.managerReviewRequired || row.overdue);
  return true;
}

export function productionQueueRowTone(item) {
  if (item.needsCoil) return 'border-amber-200 bg-amber-50/40';
  if (item.managerReviewRequired || item.overdue) return 'border-rose-200 bg-rose-50/40';
  return '';
}
