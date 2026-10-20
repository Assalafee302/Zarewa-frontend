/** Real share of the quote paid — not capped, so an overpaid quote shows e.g. 140% (owner, 2026-10-19). */
export function percentPaid(paid, total) {
  const p = Math.round(Number(paid) || 0);
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return p > 0 ? 100 : 0;
  return Math.round((p / t) * 100);
}
