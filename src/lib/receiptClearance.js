/** Threshold (₦) — sales must re-enter amount to confirm posting. */
export const RECEIPT_AMOUNT_CONFIRM_THRESHOLD_NGN = 100_000;

export const RECEIPT_CLEARANCE_RESET_CONFIRM_PHRASE = 'RESET RECEIPT CLEARANCE';

export const RECEIPT_STATUS_PENDING_CLEARANCE = 'Pending clearance';
export const RECEIPT_STATUS_CLEARED = 'Cleared';
export const RECEIPT_STATUS_REVERSED = 'Reversed';

/** Sales → Payments list: cashier-facing payment confirmation labels. */
export const SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER = 'Awaiting cashier';
export const SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED = 'Cashier confirmed';

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

/** Payment confirmation label for Sales receipts (cashier workflow). */
export function receiptSalesPaymentStatusLabel(row) {
  if (isReceiptReversed(row)) return 'Reversed';
  if (isReceiptCleared(row)) return SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED;
  return SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER;
}

/** Tailwind chip classes for `receiptSalesPaymentStatusLabel`. */
export function receiptSalesPaymentStatusChipClass(row) {
  if (isReceiptReversed(row)) return 'border-rose-200 bg-rose-50 text-rose-900';
  if (isReceiptCleared(row)) return 'border-teal-200 bg-teal-50 text-teal-900';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

export function receiptSalesPaymentStatusTitle(row) {
  if (isReceiptReversed(row)) return 'This payment was reversed on the ledger.';
  if (isReceiptCleared(row)) {
    const by = String(row?.financeReconciliationSavedBy || '').trim();
    const at = String(row?.financeReconciliationSavedAtISO || '').trim();
    if (by && at) return `Confirmed by ${by} · ${at.slice(0, 10)}`;
    if (at) return `Cashier confirmed · ${at.slice(0, 10)}`;
    return 'Cashier confirmed this payment against bank or cash.';
  }
  return 'Posted in Sales — cashier has not confirmed this payment yet.';
}

function formatConfirmDateIso(iso) {
  const raw = String(iso || '').slice(0, 10);
  if (!raw) return '';
  const [y, m, d] = raw.split('-');
  return d && m && y ? `${d}/${m}/${y}` : raw;
}

/** Inline subtitle for Sales receipt view / print (who confirmed and when). */
export function receiptSalesPaymentStatusDetail(row) {
  if (!row || isReceiptReversed(row)) return null;
  if (isReceiptCleared(row)) {
    const by = String(row?.financeReconciliationSavedBy || '').trim();
    const dateStr = formatConfirmDateIso(row?.financeReconciliationSavedAtISO);
    if (by && dateStr) return `Confirmed by ${by} · ${dateStr}`;
    if (dateStr) return `Cashier confirmed · ${dateStr}`;
    return 'Cashier confirmed this payment.';
  }
  return 'Not yet confirmed by cashier.';
}

/** Filter bucket for Sales → Payments status tabs. */
export function receiptSalesPaymentFilterBucket(row) {
  if (isReceiptReversed(row)) return 'reversed';
  if (isReceiptCleared(row)) return 'confirmed';
  return 'awaiting';
}

export function receiptMatchesSalesPaymentFilter(row, filter = 'all') {
  const bucket = receiptSalesPaymentFilterBucket(row);
  if (filter === 'awaiting') return bucket === 'awaiting';
  if (filter === 'confirmed') return bucket === 'confirmed';
  return true;
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
