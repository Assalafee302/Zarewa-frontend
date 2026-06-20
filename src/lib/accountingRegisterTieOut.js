/** Control tie-out check ids shown on each register surface. */
export const REGISTER_TIEOUT_CHECK_IDS = {
  creditor: ['trade_receivable', 'supplier_prepay', 'inter_branch_recv'],
  debtor: ['trade_payable', 'customer_deposits', 'bank_suspense', 'inter_branch_pay'],
  assets: ['fixed_assets_cost', 'accumulated_depreciation'],
};

/**
 * @param {'creditor' | 'debtor' | 'assets'} registerKind
 * @param {object[]} checks
 */
export function tieOutChecksForRegister(registerKind, checks) {
  const ids = REGISTER_TIEOUT_CHECK_IDS[registerKind] || [];
  return (checks || []).filter((c) => ids.includes(c.id));
}

/**
 * @param {object[]} subset
 */
export function tieOutSubsetSummary(subset) {
  const rows = subset || [];
  if (!rows.length) return { ok: true, warnCount: 0, label: 'No GL controls loaded' };
  const warnCount = rows.filter((c) => c.status === 'warn').length;
  return {
    ok: warnCount === 0,
    warnCount,
    label:
      warnCount === 0
        ? `${rows.length}/${rows.length} GL controls OK`
        : `${warnCount} of ${rows.length} control(s) need review`,
  };
}
