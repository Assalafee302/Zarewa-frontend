/**
 * Centralized formatters for branch manager UI.
 * Reusable across all branch manager components.
 */

export function formatMoney(value) {
  const num = Number(value) || 0;
  return `NGN ${num.toLocaleString()}`;
}

export function formatPersonName(value) {
  const v = String(value || '').trim();
  return v || '—';
}

export function formatRefundReason(raw) {
  return String(raw || '—').trim() || '—';
}

/**
 * Compute amount after credit applied (for refund display).
 * @param {number} amount - Original refund amount
 * @param {number} creditApplied - Credit already applied (legacy or new field)
 * @returns {number} Remaining amount to refund
 */
export function computeRefundAmountAfterCredit(amount, creditApplied) {
  const a = Math.round(Number(amount) || 0);
  const c = Math.round(Number(creditApplied) || 0);
  return c > 0 ? Math.max(0, a - c) : a;
}
