/**
 * Block new quotations / POs while HQ “all branches” roll-up is active.
 * @param {{ viewAllBranches?: boolean; session?: { currentBranchId?: string }; snapshot?: { workspaceBranches?: Array<{ id: string; name?: string; code?: string }> } } | null | undefined} ws
 */
export function isBranchScopedCreateBlocked(ws) {
  return Boolean(ws?.viewAllBranches);
}

/**
 * @param {Parameters<typeof isBranchScopedCreateBlocked>[0]} ws
 */
export function branchScopedCreateBlockedMessage(ws) {
  const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
  const id = String(ws?.session?.currentBranchId ?? '').trim();
  const br = branches.find((b) => b.id === id);
  const label = br?.name || br?.code || id || 'the target branch';
  return `All-branches view is read-only for new records. Uncheck “All branches”, confirm ${label} in the branch dropdown (or switch to the branch you want), then create the quotation or purchase order.`;
}
