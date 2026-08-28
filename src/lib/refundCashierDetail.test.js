import { describe, expect, it } from 'vitest';
import {
  refundCashierCustomerName,
  refundCashierMoneyStory,
  refundCashierOverpayResidualNgn,
  refundDefaultTreasuryPayoutNgn,
} from './refundCashierDetail.js';

describe('refundCashierMoneyStory', () => {
  it('splits requested vs applied onto another quote vs cash still due', () => {
    const story = refundCashierMoneyStory({
      amountNgn: 151_330,
      approvedAmountNgn: 128_300,
      paidAmountNgn: 0,
      creditAppliedNgn: 23_030,
      creditAppliedToQuotationRef: 'QT-KD-26-1282',
      status: 'Approved',
    });
    expect(story.requestedNgn).toBe(151_330);
    expect(story.appliedNgn).toBe(23_030);
    expect(story.appliedToQuote).toBe('QT-KD-26-1282');
    expect(story.approvedNgn).toBe(128_300);
    expect(story.cashDueNgn).toBe(128_300);
    expect(story.companyCutNgn).toBe(0);
    expect(story.settledAtApprovalNgn).toBe(0);
  });
});

describe('refundDefaultTreasuryPayoutNgn', () => {
  it('defaults to customer net when staff split and company cut settled at approval', () => {
    const refund = {
      refundID: 'RF-KD-26-9554',
      customerID: 'CUS-QUOTE',
      amountNgn: 297_300,
      approvedAmountNgn: 297_300,
      paidAmountNgn: 27_300,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦27,300 → retention ledger.',
      splitDistributions: [
        {
          recipientKind: 'customer',
          recipientCustomerID: 'CUS-QUOTE',
          amountNgn: 160_800,
        },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 136_500,
        },
      ],
    };
    expect(refundDefaultTreasuryPayoutNgn(refund)).toBe(160_800);
  });

  it('infers customer net from payment note when splits missing from snapshot', () => {
    const refund = {
      amountNgn: 297_300,
      approvedAmountNgn: 297_300,
      paidAmountNgn: 27_300,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦27,300 → retention ledger.',
      splitDistributions: [],
    };
    expect(refundDefaultTreasuryPayoutNgn(refund)).toBe(160_800);
  });
});

describe('refundCashierCustomerName', () => {
  it('uses refund.customer when customerName is missing', () => {
    expect(refundCashierCustomerName({ customer: 'Kaduna Sheets', customerName: '' }, null)).toBe(
      'Kaduna Sheets'
    );
  });
});

describe('refundCashierOverpayResidualNgn', () => {
  it('is zero when a prior paid overpay already covers cash above quote total', () => {
    expect(
      refundCashierOverpayResidualNgn({
        cashInNgn: 1_132_400,
        quoteTotalNgn: 981_070,
        excludeRefundId: 'RF-KD-26-9505',
        refunds: [
          {
            refundID: 'RF-KD-26-9490',
            status: 'Paid',
            amountNgn: 174_830,
            paidAmountNgn: 174_830,
            reasonCategory: 'Overpayment',
          },
          {
            refundID: 'RF-KD-26-9505',
            status: 'Approved',
            amountNgn: 151_330,
            approvedAmountNgn: 128_300,
            creditAppliedNgn: 23_030,
            reasonCategory: 'Overpayment',
          },
        ],
      })
    ).toBe(0);
  });
});
