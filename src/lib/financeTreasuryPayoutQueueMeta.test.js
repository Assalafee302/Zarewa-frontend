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

  it('tags cashier payouts with the maintenance work order', () => {
    const meta = paymentRequestPayoutMetaLine(
      {
        expenseID: 'E-3',
        maintenanceWorkOrderId: 'MWO-26-0041',
        maintenanceCostKind: 'accommodation',
        requestReference: 'MWO-26-0041',
      },
      {}
    );
    expect(meta).toContain('Work order MWO-26-0041');
    expect(meta).toContain('Accommodation');
    expect(meta).not.toContain('Ref MWO-26-0041');
  });

  it('includes request and approval dates on payment request meta', () => {
    const meta = paymentRequestPayoutMetaLine(
      {
        expenseID: 'E-2',
        requestDate: '2026-07-10',
        approvedAtISO: '2026-07-12T09:30:00.000Z',
      },
      {}
    );
    expect(meta).toContain('Requested 2026-07-10');
    expect(meta).toContain('Approved 2026-07-12');
  });

  it('includes request and approval dates on refund meta', () => {
    const meta = refundPayoutMetaLine(
      {
        quotationRef: 'Q-2',
        requestedAtISO: '2026-07-08T12:00:00.000Z',
        approvalDate: '2026-07-09',
        approvedAmountNgn: 2000,
        paidAmountNgn: 0,
      },
      {}
    );
    expect(meta).toContain('Requested 2026-07-08');
    expect(meta).toContain('Approved 2026-07-09');
  });

  it('mentions credit applied onto another quotation', () => {
    const meta = refundPayoutMetaLine(
      {
        quotationRef: 'QT-A',
        approvedAmountNgn: 128_300,
        paidAmountNgn: 0,
        creditAppliedNgn: 23_030,
        creditAppliedToQuotationRef: 'QT-B',
      },
      {}
    );
    expect(meta).toContain('Applied');
    expect(meta).toContain('QT-B');
  });
});
