/** Client mirror of shared/workspaceGovernance.js (keep in sync). */
export const EXPENSE_MD_APPROVAL_THRESHOLD_NGN = 200_000;

export function isBranchExpenseApproverRoleKey(roleKey) {
  const rk = String(roleKey || '').trim().toLowerCase();
  return rk === 'sales_manager' || rk === 'branch_manager';
}

export function isExecutiveRoleKey(roleKey) {
  return ['md', 'chairman', 'ceo'].includes(String(roleKey || '').trim().toLowerCase());
}
