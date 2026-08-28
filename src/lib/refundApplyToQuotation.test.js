import { describe, it, expect } from 'vitest';
import {
  listCustomerQuotationsWithBalanceDue,
  planApplyFromRefundSource,
  refundCreditSourceId,
  refundMayApplyCreditToQuotation,
  refundTransferableOpenNgn,
} from './refundApplyToQuotation.js';

describe('refundApplyToQuotation', () => {
  it('refundCreditSourceId prefixes refund rows', () => {
    expect(refundCreditSourceId('RF-1')).toBe('refund:RF-1');
  });

  it('lists same-customer quotations with balance due', () => {
    const rows = listCustomerQuotationsWithBalanceDue(
      [
        { id: 'QT-A', customerID: 'CUS-1', totalNgn: 100_000, paidNgn: 40_000 },
        { id: 'QT-B', customerID: 'CUS-1', totalNgn: 50_000, paidNgn: 50_000 },
        { id: 'QT-C', customerID: 'CUS-2', totalNgn: 20_000, paidNgn: 0 },
      ],
      'CUS-1'
    );
    expect(rows.map((r) => r.id)).toEqual(['QT-A']);
    expect(rows[0].dueNgn).toBe(60_000);
  });

  it('allows pending overpay refunds for credit apply kind', () => {
    expect(
      refundMayApplyCreditToQuotation({
        status: 'Pending',
        reasonCategory: 'Overpayment',
        calculationLines: [{ category: 'Overpayment', amountNgn: 10_000 }],
        amountNgn: 10_000,
      })
    ).toBe(true);
    expect(
      refundMayApplyCreditToQuotation({
        status: 'Pending',
        reasonCategory: 'Order cancellation',
        amountNgn: 10_000,
      })
    ).toBe(false);
  });

  it('plans apply from eligible payload for one refund source', () => {
    const plan = planApplyFromRefundSource(
      {
        targetDueNgn: 25_000,
        sources: [
          { id: 'refund:RF-A', availableNgn: 30_000 },
          { id: 'refund:RF-B', availableNgn: 12_000 },
        ],
      },
      'RF-A'
    );
    expect(plan.ok).toBe(true);
    expect(plan.applyNgn).toBe(25_000);
    expect(plan.leftoverOnRefundNgn).toBe(5_000);
  });

  it('refundTransferableOpenNgn respects paid and credit applied on pending overpay', () => {
    expect(
      refundTransferableOpenNgn({
        status: 'Pending',
        reasonCategory: 'Overpayment',
        amountNgn: 20_000,
        paidAmountNgn: 0,
        creditAppliedNgn: 5_000,
        calculationLines: [{ category: 'Overpayment', amountNgn: 20_000 }],
      })
    ).toBe(15_000);
  });
});
