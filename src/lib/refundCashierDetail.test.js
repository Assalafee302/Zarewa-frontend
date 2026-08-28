import { describe, expect, it } from 'vitest';
import {
  refundCashierCustomerName,
  refundCashierMoneyStory,
  refundCashierOverpayResidualNgn,
  refundDefaultTreasuryPayoutNgn,
  refundPayeePayoutQueueLines,
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

  it('uses total cash due when splits missing from snapshot (fetch refund detail for payee lines)', () => {
    const refund = {
      amountNgn: 297_300,
      approvedAmountNgn: 297_300,
      paidAmountNgn: 27_300,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦27,300 → retention ledger.',
      splitDistributions: [],
    };
    expect(refundDefaultTreasuryPayoutNgn(refund)).toBe(270_000);
  });

  it('defaults full customer cash when staff share cleared by uncleared receipt offset', () => {
    const refund = {
      refundID: 'RF-KD-26-9555',
      customerID: 'CUS-1',
      amountNgn: 89_300,
      approvedAmountNgn: 89_300,
      paidAmountNgn: 14_300,
      status: 'Approved',
      paymentNote:
        'Settled at approval: company cut ₦2,860 → retention ledger; uncleared receipts offset ₦11,440.',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 75_000 },
        { recipientKind: 'associated_staff', recipientAssociatedStaffID: 'AST-1', amountNgn: 14_300 },
      ],
    };
    const lines = refundPayeePayoutQueueLines(refund);
    expect(lines).toHaveLength(1);
    expect(lines[0].recipientKind).toBe('customer');
    expect(lines[0].amountDueNgn).toBe(75_000);
    expect(refundDefaultTreasuryPayoutNgn(refund)).toBe(75_000);
  });
});

describe('refundPayeePayoutQueueLines', () => {
  it('returns one row per payee with net due after company cut at approval', () => {
    const refund = {
      refundID: 'RF-2026-002',
      customerID: 'CUS-1',
      customer: 'Grace Emmanuel',
      amountNgn: 45_000,
      approvedAmountNgn: 45_000,
      paidAmountNgn: 4_000,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦4,000 → retention ledger.',
      payeeName: 'Grace Emmanuel',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 25_000 },
        { recipientKind: 'associated_staff', recipientAssociatedStaffID: 'AST-1', amountNgn: 20_000 },
      ],
    };
    const lines = refundPayeePayoutQueueLines(refund);
    expect(lines).toHaveLength(2);
    expect(lines[0].recipientKind).toBe('customer');
    expect(lines[0].amountDueNgn).toBe(25_000);
    expect(lines[1].recipientKind).toBe('associated_staff');
    expect(lines[1].companyDeductionNgn).toBe(4_000);
    expect(lines[1].netPayoutNgn).toBe(16_000);
    expect(lines[1].amountDueNgn).toBe(16_000);
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
