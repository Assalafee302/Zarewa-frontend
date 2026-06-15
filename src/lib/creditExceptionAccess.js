/**
 * Delivery credit exception UI gates (server enforces on POST …/decision).
 */

export function canRequestCreditException(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'sales_manager', 'branch_manager', 'finance_manager'].includes(rk);
}

export function canRevokeCreditException(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'finance_manager'].includes(rk);
}

/**
 * @param {string | null | undefined} roleKey
 * @param {{ amountNgn?: number } | null | undefined} item
 * @param {{ branchManagerLimitNgn?: number | null; mdRequiredAboveNgn?: number | null; branchLimitConfigured?: boolean; mdThresholdConfigured?: boolean } | null | undefined} policy
 */
export function canApproveCreditExceptionItem(roleKey, item, policy) {
  const rk = String(roleKey || '').toLowerCase();
  if (!['md', 'admin', 'sales_manager', 'branch_manager'].includes(rk)) return false;
  if (rk === 'md' || rk === 'admin') return true;
  const amt = Math.round(Number(item?.amountNgn) || 0);
  if (!policy) return rk === 'sales_manager' || rk === 'branch_manager';
  if (!policy.branchLimitConfigured && !policy.mdThresholdConfigured) {
    return false;
  }
  const mdAbove = policy.mdRequiredAboveNgn ?? policy.branchManagerLimitNgn ?? 0;
  if (policy.mdThresholdConfigured && amt > mdAbove) return false;
  if (policy.branchLimitConfigured && amt <= (policy.branchManagerLimitNgn ?? 0)) return true;
  return false;
}
