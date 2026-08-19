import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  mergeReceiptRowsForSales,
  salesReceiptMirrorClearanceFields,
  receiptPaidToBankLabels,
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

describe('receiptPaidToBankLabels', () => {
  const receipt = { id: 'RC-2026-010', ledgerEntryId: 'LE-10' };
  const movements = [
    {
      id: 'TM-1',
      sourceKind: 'LEDGER_RECEIPT',
      sourceId: 'RC-2026-010',
      amountNgn: 320_000,
      treasuryAccountId: 2,
      accountType: 'Bank',
      accountName: 'Zenith Production',
      bankName: 'Zenith Bank',
    },
  ];

  it('prefers treasury account bank name', () => {
    expect(
      receiptPaidToBankLabels(receipt, movements, [
        { id: 2, name: 'Zenith Production', bankName: 'Zenith Bank', type: 'Bank' },
      ])
    ).toEqual(['Zenith Bank']);
  });

  it('falls back to movement account name', () => {
    expect(receiptPaidToBankLabels(receipt, movements, [])).toEqual(['Zenith Bank']);
  });

  it('uses cash till name when there is no bank name', () => {
    expect(
      receiptPaidToBankLabels(
        { id: 'RC-2' },
        [
          {
            id: 'TM-2',
            sourceKind: 'LEDGER_RECEIPT',
            sourceId: 'RC-2',
            amountNgn: 5_000,
            treasuryAccountId: 3,
            accountType: 'Cash',
            accountName: 'Cash Office (Till)',
          },
        ],
        [{ id: 3, name: 'Cash Office (Till)', bankName: '', type: 'Cash' }]
      )
    ).toEqual(['Cash Office (Till)']);
  });
});
