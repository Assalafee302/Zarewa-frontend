/** Threshold (₦) — sales must re-enter amount to confirm posting. */
export const RECEIPT_AMOUNT_CONFIRM_THRESHOLD_NGN = 100_000;

export const RECEIPT_CLEARANCE_RESET_CONFIRM_PHRASE = 'RESET RECEIPT CLEARANCE';

export const RECEIPT_STATUS_PENDING_CLEARANCE = 'Pending clearance';
export const RECEIPT_STATUS_CLEARED = 'Cleared';
export const RECEIPT_STATUS_REVERSED = 'Reversed';

function normStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase();
}

export function isReceiptReversed(row) {
  const s = normStatus(row?.status);
  return s === 'reversed';
}

export function isReceiptCleared(row) {
  if (!row || isReceiptReversed(row)) return false;
  const saved = row.financeReconciliationSavedAtISO ?? row.finance_reconciliation_saved_at_iso;
  if (saved != null && String(saved).trim() !== '') return true;
  return normStatus(row?.status) === 'cleared';
}

export function isReceiptPendingClearance(row) {
  if (!row || isReceiptReversed(row)) return false;
  return !isReceiptCleared(row);
}

export function receiptClearanceBadgeLabel(row) {
  if (isReceiptReversed(row)) return 'Reversed';
  if (isReceiptCleared(row)) return 'Cleared';
  return 'Pending clearance';
}

export function pendingClearanceTotalNgn(receipts = []) {
  return (Array.isArray(receipts) ? receipts : []).reduce((sum, r) => {
    if (!isReceiptPendingClearance(r)) return sum;
    const cash =
      r.cashReceivedNgn != null
        ? Math.round(Number(r.cashReceivedNgn) || 0)
        : Math.round(Number(r.amountNgn ?? r.amount_ngn) || 0);
    return sum + cash;
  }, 0);
}

export function liquidityClearanceSplit(treasuryAccounts = [], salesReceipts = []) {
  const bookTotalNgn = (Array.isArray(treasuryAccounts) ? treasuryAccounts : []).reduce(
    (s, a) => s + (Number(a.balance) || 0),
    0
  );
  const pendingClearanceNgn = pendingClearanceTotalNgn(salesReceipts);
  const clearedBookNgn = Math.max(0, bookTotalNgn - pendingClearanceNgn);
  return {
    bookTotalNgn: Math.round(bookTotalNgn),
    pendingClearanceNgn: Math.round(pendingClearanceNgn),
    clearedBookNgn: Math.round(clearedBookNgn),
  };
}
