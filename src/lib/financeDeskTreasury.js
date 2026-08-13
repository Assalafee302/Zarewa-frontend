import {
  isReceiptCleared,
  isReceiptPendingClearance,
  isReceiptReversed,
  receiptEffectiveCashNgn,
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
  const key = Number.isFinite(id) ? id : 0;
  map.set(key, (map.get(key) || 0) + n);
}

function sumNgnMap(map) {
  let sum = 0;
  for (const n of map.values()) sum += n;
  return sum;
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
 * Cashier desk payment composition for an account (or branch totals).
 * `bookNgn` is the live account balance (opening + all movements).
 * Lines below that: cashier-confirmed receipts, confirmed + unlinked bank money,
 * and all inbound payments (confirmed + unlinked + draft receipts).
 *
 * @returns {{
 *   bookNgn: number;
 *   confirmedNgn: number;
 *   unlinkedNgn: number;
 *   pendingNgn: number;
 *   confirmedPlusUnlinkedNgn: number;
 *   allTotalNgn: number;
 * }}
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

function composeDeskBalanceSplit(bookNgn, confirmedNgn, unlinkedNgn, pendingNgn) {
  const confirmed = Math.round(Number(confirmedNgn) || 0);
  const unlinked = Math.round(Number(unlinkedNgn) || 0);
  const pending = Math.round(Number(pendingNgn) || 0);
  return {
    bookNgn: Math.round(Number(bookNgn) || 0),
    confirmedNgn: confirmed,
    unlinkedNgn: unlinked,
    pendingNgn: pending,
    confirmedPlusUnlinkedNgn: confirmed + unlinked,
    allTotalNgn: confirmed + unlinked + pending,
  };
}

/**
 * Split cashier-desk balances: account book vs confirmed / unlinked / all inbound payments.
 *
 * @param {{
 *   accounts?: object[];
 *   movements?: object[];
 *   receipts?: object[];
 *   bankDeposits?: object[];
 *   bookById?: Map<number, number>;
 * }} input
 */
export function treasuryDeskBalanceSplit({
  accounts = [],
  movements = [],
  receipts = [],
  bankDeposits = [],
  bookById,
} = {}) {
  const confirmedById = new Map();
  const pendingById = new Map();
  const unlinkedById = new Map();
  const receiptBySourceId = receiptLookupBySourceId(receipts);
  const attributedReceiptIds = new Set();
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
    if (receipt?.id != null) attributedReceiptIds.add(String(receipt.id));

    const pending = receipt
      ? isReceiptPendingClearance(receipt)
      : String(movement.type || '').trim() === 'RECEIPT_IN' ||
        String(movement.sourceKind || '').trim() === 'LEDGER_RECEIPT';
    bumpNgnMap(pending ? pendingById : confirmedById, movement.treasuryAccountId, amount);
  }

  for (const receipt of Array.isArray(receipts) ? receipts : []) {
    if (isReceiptReversed(receipt)) continue;
    if (receipt?.id != null && attributedReceiptIds.has(String(receipt.id))) continue;
    const cash = receiptEffectiveCashNgn(receipt);
    bumpNgnMap(
      isReceiptCleared(receipt) ? confirmedById : pendingById,
      0,
      cash
    );
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
        confirmedById.get(id) || 0,
        unlinkedById.get(id) || 0,
        pendingById.get(id) || 0
      )
    );
  }

  return {
    totals: composeDeskBalanceSplit(
      treasuryBookTotalNgn(accounts, bookById),
      sumNgnMap(confirmedById),
      sumNgnMap(unlinkedById),
      sumNgnMap(pendingById)
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
