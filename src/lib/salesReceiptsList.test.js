import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  mergeReceiptRowsForSales,
  salesReceiptMirrorClearanceFields,
} from './salesReceiptsList.js';
import {
  isReceiptCleared,
  receiptSalesPaymentFilterBucket,
  SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED,
  receiptSalesPaymentStatusLabel,
} from './receiptClearance.js';

vi.mock('./customerLedgerStore.js', () => ({
  loadLedgerEntries: vi.fn(() => []),
  amountDueOnQuotation: vi.fn(() => 0),
}));

describe('salesReceiptsList merge clearance', () => {
  beforeEach(async () => {
    const mod = await import('./customerLedgerStore.js');
    mod.loadLedgerEntries.mockReturnValue([
      {
        id: 'LE-1',
        type: 'RECEIPT',
        customerID: 'C1',
        customerName: 'Acme',
        quotationRef: 'QT-1',
        amountNgn: 50_000,
        atISO: '2026-05-20T10:00:00.000Z',
      },
    ]);
  });

  it('copies mirror clearance onto ledger rows', () => {
    const imported = [
      {
        id: 'LE-1',
        ledgerEntryId: 'LE-1',
        customerID: 'C1',
        customer: 'Acme',
        quotationRef: 'QT-1',
        amountNgn: 50_000,
        status: 'Cleared',
        financeReconciliationSavedAtISO: '2026-05-21T10:00:00.000Z',
        financeReconciliationSavedBy: 'Cashier Hauwa',
      },
    ];
    const [row] = mergeReceiptRowsForSales(imported, [{ id: 'QT-1', totalNgn: 100_000 }]);
    expect(row.source).toBe('ledger');
    expect(row.status).toBe('Cleared');
    expect(isReceiptCleared(row)).toBe(true);
    expect(receiptSalesPaymentFilterBucket(row)).toBe('confirmed');
    expect(receiptSalesPaymentStatusLabel(row)).toBe(SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED);
  });

  it('treats legacy cleared status without finance timestamp as confirmed', () => {
    const fields = salesReceiptMirrorClearanceFields({ status: 'Cleared' });
    expect(isReceiptCleared({ status: fields.status ?? 'Cleared' })).toBe(true);
  });
});
