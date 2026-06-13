import { describe, it, expect } from 'vitest';
import {
  unreconciledBankLinesPrintPayload,
  unreconciledBankReconciliationLines,
  unreconciledReceiptRows,
  unreconciledReceiptsPrintPayload,
} from './reconciliationPrint.js';

describe('reconciliationPrint', () => {
  it('filters unreconciled receipts and bank lines', () => {
    const receipts = [
      { id: 'RC-1', status: 'Pending clearance' },
      { id: 'RC-2', financeReconciliationSavedAtISO: '2026-06-01T12:00:00.000Z' },
    ];
    expect(unreconciledReceiptRows(receipts).map((r) => r.id)).toEqual(['RC-1']);

    const lines = [
      { id: 'BR-1', status: 'Review' },
      { id: 'BR-2', status: 'Matched' },
      { id: 'BR-3', status: 'PendingManager' },
    ];
    expect(unreconciledBankReconciliationLines(lines).map((l) => l.id)).toEqual(['BR-1', 'BR-3']);
  });

  it('builds receipt print payload with treasury splits', () => {
    const payload = unreconciledReceiptsPrintPayload(
      [
        {
          id: 'RC-2026-010',
          customer: 'Acme Ltd',
          quotationRef: 'QT-100',
          dateISO: '2026-06-10',
          cashReceivedNgn: 250000,
          bankReference: 'TRF-88',
        },
      ],
      [
        {
          id: 1,
          sourceKind: 'LEDGER_RECEIPT',
          sourceId: 'RC-2026-010',
          treasuryAccountId: 3,
          accountType: 'Bank',
          accountName: 'GTBank Main',
          amountNgn: 250000,
        },
      ],
      { branchLabel: 'Kaduna (HQ)' }
    );
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].receiptId).toBe('RC-2026-010');
    expect(payload.rows[0].treasuryAccounts).toContain('GTBank Main');
    expect(payload.summaryLines[0].value).toBe('1');
  });

  it('builds bank line print payload', () => {
    const payload = unreconciledBankLinesPrintPayload(
      [{ id: 'BR-9', bankDateISO: '2026-06-11', description: 'Unmatched inflow', amountNgn: 50000, status: 'Review' }],
      { branchLabel: 'Yola Factory' }
    );
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].lineId).toBe('BR-9');
    expect(payload.title).toMatch(/bank statement/i);
  });
});
