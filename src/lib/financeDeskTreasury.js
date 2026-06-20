/**
 * Cashier desk treasury display — book balance from opening + movements (matches Treasury tab).
 * @param {object[]} accounts
 * @param {object[]} movements
 * @returns {Map<number, number>}
 */
export function treasuryBookBalanceByAccountId(accounts = [], movements = []) {
  const map = new Map();
  for (const acc of Array.isArray(accounts) ? accounts : []) {
    const id = Number(acc.id);
    if (!Number.isFinite(id)) continue;
    const movSum = (Array.isArray(movements) ? movements : [])
      .filter((m) => Number(m.treasuryAccountId) === id)
      .reduce((s, m) => s + (Number(m.amountNgn) || 0), 0);
    const opening = Math.round(Number(acc.openingBalanceNgn ?? 0));
    map.set(id, (Number.isNaN(opening) ? 0 : opening) + movSum);
  }
  return map;
}

/** @param {object | null | undefined} acc @param {Map<number, number>} bookById */
export function treasuryBookDisplayNgn(acc, bookById) {
  if (!acc) return 0;
  const id = Number(acc.id);
  if (Number.isFinite(id) && bookById?.has(id)) return bookById.get(id);
  return Number(acc.balance) || 0;
}

/** @param {object[]} accounts @param {Map<number, number>} bookById */
export function treasuryBookTotalNgn(accounts = [], bookById) {
  return (Array.isArray(accounts) ? accounts : []).reduce(
    (sum, acc) => sum + treasuryBookDisplayNgn(acc, bookById),
    0
  );
}
