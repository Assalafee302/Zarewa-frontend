import { describe, it, expect } from 'vitest';
import { paymentReconciliationExceptionQueue } from './liveAnalytics.js';

describe('paymentReconciliationExceptionQueue', () => {
  it('prioritizes receipt/treasury mismatches and AR discrepancies', () => {
    const ledgerEntries = [
      {
        id: 'LE-R1',
        type: 'RECEIPT',
        customerID: 'C1',
        customerName: 'Acme',
        quotationRef: 'QT-1',
        amountNgn: 100_000,
        atISO: '2026-05-01T12:00:00.000Z',
        bankReference: 'REF',
      },
    ];
    const treasuryMovements = [
      {
        id: 'M1',
        type: 'RECEIPT_IN',
        sourceKind: 'LEDGER_RECEIPT',
        sourceId: 'LE-R1',
        amountNgn: 50_000,
        postedAtISO: '2026-05-01T12:00:00.000Z',
      },
    ];
    const quotations = [
      {
        id: 'QT-1',
        dateISO: '2026-05-01',
        customer: 'Acme',
        totalNgn: 500_000,
        paidNgn: 200_000,
      },
    ];
    const salesReceipts = [{ id: 'LE-R1', quotationRef: 'QT-1', amountNgn: 100_000, status: 'Recorded' }];

    const q = paymentReconciliationExceptionQueue(
      ledgerEntries,
      treasuryMovements,
      quotations,
      salesReceipts,
      '2026-05-01',
      '2026-05-31'
    );
    expect(q.length).toBeGreaterThan(0);
    const receiptIssue = q.find((r) => r.bucket === 'receipt_treasury');
    expect(receiptIssue).toBeDefined();
    expect(receiptIssue.severity).toBeDefined();
  });

  it('returns empty when data is clean in range', () => {
    const q = paymentReconciliationExceptionQueue([], [], [], [], '2026-05-01', '2026-05-31');
    expect(q).toEqual([]);
  });
});
