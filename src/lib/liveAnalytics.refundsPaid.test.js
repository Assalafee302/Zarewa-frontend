import { describe, expect, it } from 'vitest';
import { refundsPaidInPeriodRows, refundPeriodOverviewRows } from './liveAnalytics.js';

describe('refundsPaidInPeriodRows', () => {
  it('includes payout history lines in range', () => {
    const rows = refundsPaidInPeriodRows(
      [
        {
          refundID: 'RF-1',
          customer: 'Ada',
          quotationRef: 'QT-100',
          status: 'Paid',
          paidAmountNgn: 500,
          payoutHistory: [{ postedAtISO: '2026-05-02T10:00:00.000Z', amountNgn: 500, accountName: 'Bank' }],
        },
      ],
      '2026-05-01',
      '2026-05-31'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amountNgn).toBe(500);
    expect(rows[0].payoutDateISO).toBe('2026-05-02');
  });

  it('falls back to paidAtISO when payout history has no usable dates', () => {
    const rows = refundsPaidInPeriodRows(
      [
        {
          refundID: 'RF-2',
          customer: 'Bola',
          quotationRef: 'QT-200',
          status: 'Paid',
          paidAmountNgn: 1200,
          paidAtISO: '2026-05-10T12:00:00.000Z',
          payoutHistory: [{ amountNgn: 1200 }],
        },
      ],
      '2026-05-01',
      '2026-05-31'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amountNgn).toBe(1200);
    expect(rows[0].payoutDateISO).toBe('2026-05-10');
  });
});

describe('refundPeriodOverviewRows paid fallback', () => {
  it('counts paidAtISO when payout history is empty', () => {
    const rows = refundPeriodOverviewRows(
      [
        {
          refundID: 'RF-3',
          customer: 'Chi',
          quotationRef: 'QT-300',
          status: 'Paid',
          paidAmountNgn: 800,
          paidAtISO: '2026-05-08',
          payoutHistory: [],
        },
      ],
      [],
      '2026-05-01',
      '2026-05-31'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amountRefundPaidNgn).toBe(800);
  });
});
