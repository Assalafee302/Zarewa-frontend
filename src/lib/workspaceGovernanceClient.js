/** Client mirror of shared/workspaceGovernance.js (keep in sync). */
export const EXPENSE_MD_APPROVAL_THRESHOLD_NGN = 200_000;

export function isBranchExpenseApproverRoleKey(roleKey) {
  const rk = String(roleKey || '').trim().toLowerCase();
  return rk === 'sales_manager' || rk === 'branch_manager';
}

export function isExecutiveRoleKey(roleKey) {
  return ['md', 'chairman', 'ceo'].includes(String(roleKey || '').trim().toLowerCase());
}

export function userMayOverrideProductionAlignment(roleKey) {
  const rk = String(roleKey || '').trim().toLowerCase();
  if (rk === 'admin') return true;
  if (isExecutiveRoleKey(rk)) return true;
  return isBranchExpenseApproverRoleKey(rk);
}

export function isManagerClearanceAuthorityRoleKey(roleKey) {
  const rk = String(roleKey || '').trim().toLowerCase();
  return rk === 'admin' || isExecutiveRoleKey(rk) || isBranchExpenseApproverRoleKey(rk);
}

/** @param {{ roleKey?: string; permissions?: string[] } | null | undefined} actor */
export function userMayPerformManagerQuotationClearance(actor) {
  if (!actor) return false;
  const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
  if (perms.includes('*')) return true;
  return isManagerClearanceAuthorityRoleKey(actor.roleKey);
}

/** @param {{ roleKey?: string; permissions?: string[] } | null | undefined} actor */
export function userMayReleaseQuotationPaymentHold(actor) {
  if (!actor) return false;
  const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
  if (perms.includes('*')) return true;
  const rk = String(actor.roleKey || '').trim().toLowerCase();
  return rk === 'admin' || isExecutiveRoleKey(rk);
}

/** @param {{ roleKey?: string; permissions?: string[] } | null | undefined} actor */
export function userMayBlockQuotationRefunds(actor) {
  return userMayReleaseQuotationPaymentHold(actor);
}
