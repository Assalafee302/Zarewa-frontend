/** Normalize branch scope for comparing panel filter vs workspace snapshot. */
export function accountingRegisterBranchKey(branchId) {
  const raw = branchId && branchId !== 'ALL' ? String(branchId).trim() : '';
  return raw || 'ALL';
}

/** True when a preloaded register pack matches the active branch scope. */
export function snapshotRegisterMatches(pack, branchId, snapshotBranchScope) {
  if (!pack?.ok) return false;
  return (
    accountingRegisterBranchKey(branchId) === accountingRegisterBranchKey(snapshotBranchScope)
  );
}
