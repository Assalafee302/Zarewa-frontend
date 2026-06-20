import { describe, expect, it } from 'vitest';
import {
  paymentRequestOutstandingNgn,
  paymentRequestPayoutMetaLine,
  refundPayoutMetaLine,
} from './financeTreasuryPayoutQueueMeta.js';

describe('financeTreasuryPayoutQueueMeta', () => {
  it('builds refund meta with quote and approval', () => {
    const meta = refundPayoutMetaLine(
      {
        quotationRef: 'Q-1',
        approvedBy: 'MD',
        approvedAmountNgn: 5000,
        paidAmountNgn: 1000,
      },
      {}
    );
    expect(meta).toContain('Quote Q-1');
    expect(meta).toContain('Approved by MD');
  });

  it('computes payment request outstanding', () => {
    expect(
      paymentRequestOutstandingNgn({ amountRequestedNgn: 10000, paidAmountNgn: 3000 })
    ).toBe(7000);
  });

  it('includes branch in payment request meta', () => {
    const meta = paymentRequestPayoutMetaLine(
      { expenseID: 'E-1', branchId: 'BR-YOL' },
      { 'BR-YOL': 'Yola' }
    );
    expect(meta).toContain('Linked E-1');
    expect(meta).toContain('Yola');
  });
});
