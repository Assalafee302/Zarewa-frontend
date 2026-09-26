import { describe, it, expect } from 'vitest';
import {
  allocatedRefundSplitGrossNgn,
  rebalanceQuoteCustomerRemainder,
  refundSplitRowHasPayee,
  remainingRefundSplitNgn,
  withFilledSplitAmountIfEmpty,
} from './refundPayoutSplitBalance.js';

describe('refundPayoutSplitBalance', () => {
  it('does not treat an amount-only row as allocated', () => {
    const rows = [
      { recipientKind: 'customer', recipientCustomerID: '', amountNgn: '410870' },
      { recipientKind: 'customer', recipientCustomerID: 'CUS-STAFF', amountNgn: '100000' },
    ];
    expect(refundSplitRowHasPayee(rows[0])).toBe(false);
    expect(allocatedRefundSplitGrossNgn(rows)).toBe(100000);
    expect(remainingRefundSplitNgn(rows, 510870)).toBe(410870);
  });

  it('puts leftover on the quote customer after staff amounts change', () => {
    const rows = [
      {
        recipientKind: 'customer',
        recipientCustomerID: 'CUS-QUOTE',
        amountNgn: '510870',
      },
      {
        recipientKind: 'customer',
        recipientCustomerID: 'CUS-STAFF',
        amountNgn: '100000',
      },
    ];
    const next = rebalanceQuoteCustomerRemainder(rows, 510870, 'CUS-QUOTE');
    expect(next[0].amountNgn).toBe('410870');
    expect(next[1].amountNgn).toBe('100000');
  });

  it('fills leftover only when the new row amount is still empty', () => {
    expect(withFilledSplitAmountIfEmpty({ amountNgn: '' }, 410870).amountNgn).toBe('410870');
    expect(withFilledSplitAmountIfEmpty({ amountNgn: '50' }, 410870).amountNgn).toBe('50');
  });
});
