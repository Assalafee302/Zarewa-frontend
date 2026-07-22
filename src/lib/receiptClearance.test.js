import { describe, expect, it } from 'vitest';
import {
  isReceiptCleared,
  isReceiptPendingClearance,
  liquidityClearanceSplit,
  pendingClearanceTotalNgn,
  receiptClearanceBadgeLabel,
  receiptSalesPaymentStatusChipClass,
  receiptSalesPaymentStatusDetail,
  receiptSalesPaymentStatusLabel,
  receiptMatchesSalesPaymentFilter,
  receiptEffectiveCashNgn,
  SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER,
  SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED,
} from './receiptClearance.js';

describe('receiptClearance', () => {
  it('detects pending vs cleared from finance reconciliation timestamp', () => {
    const pending = { amountNgn: 50_000, status: 'Pending clearance' };
    const cleared = {
      amountNgn: 50_000,
      status: 'Cleared',
      financeReconciliationSavedAtISO: '2026-05-20T10:00:00.000Z',
    };
    expect(isReceiptPendingClearance(pending)).toBe(true);
    expect(isReceiptCleared(pending)).toBe(false);
    expect(isReceiptPendingClearance(cleared)).toBe(false);
    expect(isReceiptCleared(cleared)).toBe(true);
    expect(receiptClearanceBadgeLabel(pending)).toBe('Pending clearance');
    expect(receiptClearanceBadgeLabel(cleared)).toBe('Cleared');
  });

  it('computes liquidity split for dashboard', () => {
    const split = liquidityClearanceSplit(
      [{ balance: 2_000_000 }],
      [
        { amountNgn: 300_000, status: 'Pending clearance' },
        { amountNgn: 200_000, financeReconciliationSavedAtISO: '2026-05-01' },
      ]
    );
    expect(split.bookTotalNgn).toBe(2_000_000);
    expect(split.pendingClearanceNgn).toBe(300_000);
    expect(split.clearedBookNgn).toBe(1_700_000);
  });

  it('sums pending clearance total', () => {
    expect(
      pendingClearanceTotalNgn([
        { amountNgn: 100 },
        { amountNgn: 200, financeReconciliationSavedAtISO: 'x' },
        { amountNgn: 50, status: 'Reversed' },
      ])
    ).toBe(100);
  });

  it('maps sales payment status labels for cashier confirmation', () => {
    const pending = { amountNgn: 50_000 };
    const cleared = {
      amountNgn: 50_000,
      financeReconciliationSavedAtISO: '2026-05-20T10:00:00.000Z',
      financeReconciliationSavedBy: 'Cashier Hauwa',
    };
    const legacyConfirmed = { amountNgn: 50_000, status: 'Confirmed' };
    expect(receiptSalesPaymentStatusLabel(pending)).toBe(SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER);
    expect(receiptSalesPaymentStatusLabel(cleared)).toBe(SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED);
    expect(receiptSalesPaymentStatusLabel(legacyConfirmed)).toBe(SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED);
    expect(isReceiptCleared(legacyConfirmed)).toBe(true);
    expect(isReceiptPendingClearance(legacyConfirmed)).toBe(false);
    expect(receiptSalesPaymentStatusChipClass(pending)).toContain('amber');
    expect(receiptSalesPaymentStatusChipClass(cleared)).toContain('teal');
    expect(receiptSalesPaymentStatusDetail(cleared)).toBe('Confirmed by Cashier Hauwa · 20/05/2026');
    expect(receiptSalesPaymentStatusDetail(pending)).toBe('Not yet confirmed by cashier.');
    expect(receiptMatchesSalesPaymentFilter(pending, 'awaiting')).toBe(true);
    expect(receiptMatchesSalesPaymentFilter(cleared, 'awaiting')).toBe(false);
    expect(receiptMatchesSalesPaymentFilter(cleared, 'confirmed')).toBe(true);
  });

  it('uses finance bank-received as effective cash when reconciled', () => {
    expect(
      receiptEffectiveCashNgn({
        amountNgn: 415_350,
        financeReconciliationSavedAtISO: '2026-05-21T10:00:00.000Z',
        bankReceivedAmountNgn: 620_000,
      })
    ).toBe(620_000);
  });
});
