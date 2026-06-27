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

/**
 * First treasury account whose payout lines exceed available book balance.
 * Accounts with no payout lines on this payment are skipped — so a low/negative
 * balance on one account cannot block payout from another.
 *
 * @param {object[]} validLines — output of mapTreasuryPayoutLinesForApi
 * @param {object[]} accounts
 * @param {Map<number, number>} [bookById]
 * @returns {object | null}
 */
export function findTreasuryPayoutShortAccount(validLines, accounts, bookById) {
  for (const account of Array.isArray(accounts) ? accounts : []) {
    const accountId = Number(account.id);
    if (!Number.isFinite(accountId)) continue;
    const applied = (Array.isArray(validLines) ? validLines : [])
      .filter((line) => Number(line.treasuryAccountId) === accountId)
      .reduce((sum, line) => sum + (Number(line.amountNgn) || 0), 0);
    if (applied <= 0) continue;
    if (applied > treasuryBookDisplayNgn(account, bookById)) return account;
  }
  return null;
}
