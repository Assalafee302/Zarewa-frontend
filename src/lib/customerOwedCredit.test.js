import { describe, expect, it } from 'vitest';
import { customerOwedCreditLine, customerOwedCreditSummary } from './customerOwedCredit.js';

describe('customer owed credit (A6)', () => {
  it('splits approved refunds from unapplied overpay credit', () => {
    const s = customerOwedCreditSummary({
      sources: [
        { id: 'refund:RF-1', kind: 'refund', refundId: 'RF-1', status: 'Approved', availableNgn: 40000 },
        { id: 'overpay:QT-9', kind: 'overpay', availableNgn: 15000 },
      ],
      unavailableSources: [
        { id: 'refund:RF-2', refundId: 'RF-2', status: 'Partially paid', availableNgn: 5000 },
        { id: 'refund:RF-3', refundId: 'RF-3', status: 'Paid', availableNgn: 0 },
        { id: 'refund:RF-1', refundId: 'RF-1', status: 'Approved', availableNgn: 40000 },
      ],
    });
    expect(s).toEqual({ approvedRefundsNgn: 45000, approvedRefundCount: 2, unappliedCreditNgn: 15000, totalNgn: 60000 });
    expect(customerOwedCreditLine(s)).toMatch(/Customer has ₦45,000 approved refunds \/ ₦15,000 unapplied credit/);
  });

  it('shows nothing when we owe nothing', () => {
    expect(customerOwedCreditLine(customerOwedCreditSummary(null))).toBe('');
  });
});
