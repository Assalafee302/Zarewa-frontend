import { describe, expect, it } from 'vitest';
import { deskPayoutLines, payoutHeadline, receiptHeadlines } from './financeDeskHeadlines.js';

describe('desk headlines (A3)', () => {
  it('pending and held receipts are counted and summed on their own lists', () => {
    const h = receiptHeadlines({
      pending: [{ amountNgn: 100 }, { amountNgn: 250 }],
      held: [{ amountNgn: 9000 }],
      amountOf: (r) => r.amountNgn,
    });
    expect(h.pending).toEqual({ count: 2, ngn: 350 });
    expect(h.held).toEqual({ count: 1, ngn: 9000 });
  });

  it('payout open and ready describe the same list', () => {
    const lines = deskPayoutLines({
      refundLines: [
        { refundID: 'RF-1', queueKey: 'customer-0', amountDueNgn: 10000, parentRefund: {} },
        { refundID: 'RF-2', queueKey: 'customer-0', amountDueNgn: 5000, parentRefund: { payoutHold: true } },
        { refundID: 'RF-3', queueKey: 'staff-1', amountDueNgn: 0, parentRefund: {} },
      ],
      paymentRequests: [{ requestID: 'PR-1', amountRequestedNgn: 3000, paidAmountNgn: 1000, approvalStatus: 'Approved' }],
      haulage: [{ poID: 'PO-1', outstandingNgn: 40000, transportPayoutHold: 1 }],
    });
    const head = payoutHeadline(lines);
    expect(head.openCount).toBe(5);
    expect(head.openNgn).toBe(10000 + 5000 + 0 + 2000 + 40000);
    expect(head.readyCount).toBe(2);
    expect(head.readyNgn).toBe(12000);
    expect(head.notReadyCount).toBe(3);
  });
});
