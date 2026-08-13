import {
  isReceiptPendingClearance,
  isReceiptReversed,
} from './receiptClearance.js';
import { BANK_DEPOSIT_LINKABLE_STATUSES, bankDepositRemainingNgn } from './bankDeposits.js';

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

function bumpNgnMap(map, accountId, amountNgn) {
  const n = Math.round(Number(amountNgn) || 0);
  if (!n) return;
  const id = Number(accountId);
  if (!Number.isFinite(id)) return;
  map.set(id, (map.get(id) || 0) + n);
}

function isReceiptOrAdvanceInflow(movement) {
  if (!movement || movement.reversesMovementId) return false;
  const type = String(movement.type || '').trim();
  const sourceKind = String(movement.sourceKind || '').trim();
  return (
    type === 'RECEIPT_IN' ||
    type === 'ADVANCE_IN' ||
    sourceKind === 'LEDGER_RECEIPT' ||
    sourceKind === 'LEDGER_ADVANCE'
  );
}

function receiptLookupBySourceId(receipts = []) {
  const map = new Map();
  for (const receipt of Array.isArray(receipts) ? receipts : []) {
    if (receipt?.id != null && String(receipt.id).trim() !== '') {
      map.set(String(receipt.id).trim(), receipt);
    }
    if (receipt?.ledgerEntryId != null && String(receipt.ledgerEntryId).trim() !== '') {
      map.set(String(receipt.ledgerEntryId).trim(), receipt);
    }
  }
  return map;
}

/**
 * Per-account cashier desk balances (not lifetime payment totals).
 * `allTotalNgn` / `bookNgn` is the live account balance.
 * Confirmed (linked) = that balance after removing draft receipts and unlinked deposits.
 * Confirmed + unlinked = account balance after removing draft receipts only.
 */
export function emptyTreasuryDeskBalanceSplit() {
  return {
    bookNgn: 0,
    confirmedNgn: 0,
    unlinkedNgn: 0,
    pendingNgn: 0,
    confirmedPlusUnlinkedNgn: 0,
    allTotalNgn: 0,
  };
}

function composeDeskBalanceSplit(bookNgn, unlinkedNgn, pendingNgn) {
  const book = Math.round(Number(bookNgn) || 0);
  const unlinked = Math.max(0, Math.round(Number(unlinkedNgn) || 0));
  const pending = Math.max(0, Math.round(Number(pendingNgn) || 0));
  return {
    bookNgn: book,
    unlinkedNgn: unlinked,
    pendingNgn: pending,
    confirmedPlusUnlinkedNgn: book - pending,
    confirmedNgn: book - pending - unlinked,
    allTotalNgn: book,
  };
}

/**
 * Split each treasury account's live balance into confirmed (linked), confirmed+unlinked, and all.
 */
export function treasuryDeskBalanceSplit({
  accounts = [],
  movements = [],
  receipts = [],
  bankDeposits = [],
  bookById,
} = {}) {
  const pendingById = new Map();
  const unlinkedById = new Map();
  const receiptBySourceId = receiptLookupBySourceId(receipts);
  const reversedMovementIds = new Set(
    (Array.isArray(movements) ? movements : [])
      .map((m) => String(m?.reversesMovementId || '').trim())
      .filter(Boolean)
  );

  for (const movement of Array.isArray(movements) ? movements : []) {
    if (!isReceiptOrAdvanceInflow(movement)) continue;
    if (movement.id != null && reversedMovementIds.has(String(movement.id))) continue;
    const amount = Math.round(Number(movement.amountNgn) || 0);
    if (amount <= 0) continue;
    const sourceId = String(movement.sourceId || '').trim();
    const receipt = sourceId ? receiptBySourceId.get(sourceId) : null;
    if (receipt && isReceiptReversed(receipt)) continue;
    const pending = receipt
      ? isReceiptPendingClearance(receipt)
      : String(movement.type || '').trim() === 'RECEIPT_IN' ||
        String(movement.sourceKind || '').trim() === 'LEDGER_RECEIPT';
    if (pending) bumpNgnMap(pendingById, movement.treasuryAccountId, amount);
  }

  for (const deposit of Array.isArray(bankDeposits) ? bankDeposits : []) {
    const remaining = bankDepositRemainingNgn(deposit);
    const status = String(deposit?.status || '').toUpperCase();
    if (remaining > 0 && BANK_DEPOSIT_LINKABLE_STATUSES.has(status)) {
      bumpNgnMap(unlinkedById, deposit.treasuryAccountId, remaining);
    }
  }

  const byAccountId = new Map();
  for (const account of Array.isArray(accounts) ? accounts : []) {
    const id = Number(account.id);
    if (!Number.isFinite(id)) continue;
    byAccountId.set(
      id,
      composeDeskBalanceSplit(
        treasuryBookDisplayNgn(account, bookById),
        unlinkedById.get(id) || 0,
        pendingById.get(id) || 0
      )
    );
  }

  return {
    totals: composeDeskBalanceSplit(
      treasuryBookTotalNgn(accounts, bookById),
      [...unlinkedById.values()].reduce((s, n) => s + n, 0),
      [...pendingById.values()].reduce((s, n) => s + n, 0)
    ),
    byAccountId,
  };
}

/** @param {Map<number, object>} byAccountId @param {object | null | undefined} account */
export function treasuryDeskBalanceForAccount(byAccountId, account) {
  const id = Number(account?.id);
  if (Number.isFinite(id) && byAccountId?.has(id)) return byAccountId.get(id);
  return emptyTreasuryDeskBalanceSplit();
}
