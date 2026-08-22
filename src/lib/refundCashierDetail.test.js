import { describe, expect, it } from 'vitest';
import { refundCashierCustomerName, refundCashierMoneyStory, refundCashierOverpayResidualNgn } from './refundCashierDetail.js';

describe('refundCashierMoneyStory', () => {
  it('splits requested vs applied onto another quote vs cash still due', () => {
    expect(
      refundCashierMoneyStory({
        amountNgn: 151_330,
        approvedAmountNgn: 128_300,
        paidAmountNgn: 0,
        creditAppliedNgn: 23_030,
        creditAppliedToQuotationRef: 'QT-KD-26-1282',
        status: 'Approved',
      })
    ).toEqual({
      requestedNgn: 151_330,
      appliedNgn: 23_030,
      appliedToQuote: 'QT-KD-26-1282',
      approvedNgn: 128_300,
      paidNgn: 0,
      cashDueNgn: 128_300,
    });
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
