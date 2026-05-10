/** Matches server pricingPolicyResolve: published list rounding + premium profile column. */

/** Below ₦5,000 → nearest ₦50; otherwise nearest ₦100 */
export function roundPublishedPrice(ngn) {
  const n = Math.round(Number(ngn) || 0);
  if (n <= 0) return 0;
  if (n < 5000) {
    return Math.round(n / 50) * 50;
  }
  return Math.round(n / 100) * 100;
}

/** Metcoppo / Steptiles: 3.5% on base, then rounding. */
export function premiumProfilePriceFromBase(base) {
  return roundPublishedPrice((Number(base) || 0) * 1.035);
}

export function listPriceFromFloorAndCommission(floorNgn, commissionNgn) {
  const f = Math.max(0, Math.round(Number(floorNgn) || 0));
  const c = Math.max(0, Number(commissionNgn) || 0);
  return roundPublishedPrice(f + c);
}
