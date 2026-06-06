/**
 * Navigate to HR letter generation with pre-filled context.
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {{ letterKind?: string; userId?: string; sourceRecordId?: string; sourceRecordKind?: string; extra?: Record<string, string> }} opts
 */
export function navigateToHrLetter(navigate, opts = {}) {
  const params = new URLSearchParams();
  if (opts.letterKind) params.set('letterKind', opts.letterKind);
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.sourceRecordId) params.set('sourceRecordId', opts.sourceRecordId);
  if (opts.sourceRecordKind) params.set('sourceRecordKind', opts.sourceRecordKind);
  if (opts.extra && typeof opts.extra === 'object') {
    params.set('extra', JSON.stringify(opts.extra));
  }
  navigate(`/hr/documents?tab=letters&${params.toString()}`);
}

/** Map transfer type to letter kind. */
export function transferLetterKind(transferType) {
  const t = String(transferType || '').toLowerCase();
  if (t === 'inter_branch') return 'transfer_inter_branch';
  if (t === 'in_branch') return 'transfer_in_branch';
  if (t === 'hq_to_branch') return 'transfer_hq_to_branch';
  if (t === 'branch_to_hq') return 'transfer_branch_to_hq';
  if (t === 'temporary') return 'transfer_temporary';
  return 'transfer';
}

/** @param {import('react-router-dom').URLSearchParams} searchParams */
export function parseHrLetterDeepLink(searchParams) {
  let extra = {};
  try {
    const raw = searchParams.get('extra');
    if (raw) extra = JSON.parse(raw);
  } catch {
    extra = {};
  }
  const sourceRecordId = searchParams.get('sourceRecordId');
  if (sourceRecordId && !extra.sourceRecordId) extra.sourceRecordId = sourceRecordId;
  return {
    letterKind: searchParams.get('letterKind') || '',
    userId: searchParams.get('userId') || '',
    sourceRecordId: sourceRecordId || '',
    sourceRecordKind: searchParams.get('sourceRecordKind') || '',
    extra,
  };
}
