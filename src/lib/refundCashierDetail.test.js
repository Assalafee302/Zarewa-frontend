import { describe, expect, it } from 'vitest';
import {
  actorMayOverrideRefundUnclearedPayoutHold,
  flattenRefundDeskQueue,
  flattenRefundPayeePayoutQueue,
  refundCashierCustomerName,
  refundCashierMoneyStory,
  refundCashierOverpayResidualNgn,
  refundDefaultTreasuryPayoutNgn,
  refundPayeePayoutCaution,
  refundPayeePayoutQueueLines,
  refundRecipientTillPayoutRows,
} from './refundCashierDetail.js';
import { refundsOnFinanceRefundQueue } from './refundsStore.js';

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

  it('defaults full customer cash when staff share is held for uncleared receipts', () => {
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
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 14_300,
          unclearedReceiptHoldNgn: 11_440,
        },
      ],
    };
    const lines = refundPayeePayoutQueueLines(refund);
    expect(lines).toHaveLength(1);
    expect(lines[0].recipientKind).toBe('customer');
    expect(lines[0].amountDueNgn).toBe(75_000);
    expect(refundDefaultTreasuryPayoutNgn(refund)).toBe(75_000);
  });
});

describe('refundRecipientTillPayoutRows', () => {
  it('shows staff held for uncleared receipts without till due while customer stays in queue', () => {
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
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 75_000, payeeName: 'YAHAYA NASIRU' },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 14_300,
          payeeName: 'Muhammad Ibrahim Bakari',
          unclearedReceiptHoldNgn: 11_440,
        },
      ],
    };
    const rows = refundRecipientTillPayoutRows(refund);
    expect(rows).toHaveLength(2);
    const customer = rows.find((row) => row.recipientKind === 'customer');
    const staff = rows.find((row) => row.recipientKind === 'associated_staff');
    expect(customer?.amountDueNgn).toBe(75_000);
    expect(customer?.payoutStatus).toBe('till_due');
    expect(staff?.amountDueNgn).toBe(0);
    expect(staff?.payoutStatus).toBe('held_uncleared');
    expect(refundPayeePayoutQueueLines(refund)).toHaveLength(1);
  });

  it('lets admin put a held payee back on the till queue', () => {
    const refund = {
      refundID: 'RF-ADMIN-UNCLR',
      customerID: 'CUS-1',
      amountNgn: 89_300,
      approvedAmountNgn: 89_300,
      paidAmountNgn: 2_860,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦2,860 → retention ledger.',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 75_000, payeeName: 'YAHAYA NASIRU' },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 14_300,
          payeeName: 'Muhammad Ibrahim Bakari',
          unclearedReceiptHoldNgn: 11_440,
        },
      ],
    };
    const rows = refundRecipientTillPayoutRows(refund, { overrideUnclearedHold: true });
    const staff = rows.find((row) => row.recipientKind === 'associated_staff');
    expect(staff?.payoutStatus).toBe('admin_override_uncleared');
    expect(staff?.amountDueNgn).toBeGreaterThan(0);
    expect(refundPayeePayoutQueueLines(refund, { overrideUnclearedHold: true })).toHaveLength(2);
  });

  it('still lets admin pay a held staff line after paid_amount swallowed the net', () => {
    const refund = {
      refundID: 'RF-ADMIN-PAID-AMT',
      customerID: 'CUS-1',
      amountNgn: 89_300,
      approvedAmountNgn: 89_300,
      paidAmountNgn: 14_300,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦2,860 → retention ledger; uncleared receipts offset ₦11,440.',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 75_000, payeeName: 'YAHAYA NASIRU' },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 14_300,
          payeeName: 'Muhammad Ibrahim Bakari',
          unclearedReceiptHoldNgn: 11_440,
        },
      ],
    };
    const cashier = refundPayeePayoutQueueLines(refund);
    expect(cashier.find((line) => line.recipientKind === 'associated_staff')).toBeUndefined();
    const admin = refundPayeePayoutQueueLines(refund, { overrideUnclearedHold: true });
    const staff = admin.find((line) => line.recipientKind === 'associated_staff');
    expect(staff?.amountDueNgn).toBe(11_440);
    expect(staff?.payoutHeldForUnclearedReceipts).toBe(true);
  });

  it('lets admin till-pay only the held slice when the rest is on a partner wallet', () => {
    const refund = {
      refundID: 'RF-ADMIN-WALLET-HELD',
      customerID: 'CUS-1',
      amountNgn: 89_300,
      approvedAmountNgn: 89_300,
      paidAmountNgn: 2_860,
      walletOpenNgn: 75_000,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦2,860 → retention ledger.',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 75_000, payeeName: 'YAHAYA NASIRU' },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 14_300,
          payeeName: 'Muhammad Ibrahim Bakari',
          unclearedReceiptHoldNgn: 11_440,
        },
      ],
    };
    expect(refundPayeePayoutQueueLines(refund)).toHaveLength(0);
    const admin = refundPayeePayoutQueueLines(refund, { overrideUnclearedHold: true });
    expect(admin).toHaveLength(1);
    expect(admin[0].recipientKind).toBe('associated_staff');
    expect(admin[0].amountDueNgn).toBe(11_440);
    expect(refundsOnFinanceRefundQueue([refund])).toHaveLength(1);
  });

  it('shows overpayment staff as referral-available while till payout stays held', () => {
    const refund = {
      refundID: 'RF-KD-26-9553',
      customerID: 'CUS-1',
      amountNgn: 61_200,
      approvedAmountNgn: 61_200,
      paidAmountNgn: 12_240,
      status: 'Approved',
      reasonCategory: '["Overpayment"]',
      calculationLines: [{ category: 'Overpayment', amountNgn: 61_200 }],
      splitDistributions: [
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-9553',
          amountNgn: 61_200,
          unclearedReceiptHoldNgn: 48_960,
        },
      ],
    };
    const rows = refundRecipientTillPayoutRows(refund);
    expect(rows).toHaveLength(1);
    expect(rows[0].payoutStatus).toBe('referral_available');
    expect(rows[0].amountDueNgn).toBe(0);
    expect(refundPayeePayoutQueueLines(refund)).toHaveLength(0);
    expect(flattenRefundPayeePayoutQueue([refund])).toHaveLength(0);
    const desk = flattenRefundDeskQueue([refund]);
    expect(desk.length).toBeGreaterThan(0);
    expect(desk[0].payoutStatus).toBe('referral_available');
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

describe('refundPayeePayoutCaution', () => {
  it('warns when bank details are missing', () => {
    const refund = {
      refundID: 'RF-1',
      approvedAmountNgn: 25_000,
      paidAmountNgn: 0,
      status: 'Approved',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 25_000 },
      ],
    };
    const line = {
      refundID: 'RF-1',
      recipientKind: 'customer',
      amountDueNgn: 25_000,
      payeeAccountNo: '',
      payeeBankName: '',
    };
    const caution = refundPayeePayoutCaution(refund, line, { siblingPayeeLines: [line] });
    expect(caution.level).toBe('warn');
    expect(caution.codes).toContain('missing_bank');
  });

  it('marks split payout when multiple payees are still due', () => {
    const refund = {
      refundID: 'RF-2026-002',
      customerID: 'CUS-1',
      approvedAmountNgn: 45_000,
      paidAmountNgn: 4_000,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦4,000 → retention ledger.',
      payeeAccountNo: '0123456789',
      payeeBankName: 'GTBank',
      splitDistributions: [
        { recipientKind: 'customer', recipientCustomerID: 'CUS-1', amountNgn: 25_000 },
        {
          recipientKind: 'associated_staff',
          recipientAssociatedStaffID: 'AST-1',
          amountNgn: 20_000,
          payoutAccount: {
            payeeName: 'Staff Payee',
            payeeBankName: 'Access Bank',
            payeeAccountNo: '9988776655',
          },
        },
      ],
    };
    const lines = refundPayeePayoutQueueLines(refund);
    expect(lines).toHaveLength(2);
    const caution = refundPayeePayoutCaution(refund, lines[0], { siblingPayeeLines: lines });
    expect(caution.codes).toContain('multi_payee');
    expect(caution.level).toBe('info');
    expect(caution.tone).toBe('violet');
  });

  it('warns when settlement exists but splits are missing from snapshot', () => {
    const refund = {
      refundID: 'RF-2026-002',
      approvedAmountNgn: 45_000,
      paidAmountNgn: 4_000,
      status: 'Approved',
      paymentNote: 'Settled at approval: company cut ₦4,000 → retention ledger.',
    };
    const line = {
      refundID: 'RF-2026-002',
      recipientKind: 'customer',
      amountDueNgn: 41_000,
      payeeAccountNo: '0123456789',
      payeeBankName: 'GTBank',
    };
    const caution = refundPayeePayoutCaution(refund, line, { siblingPayeeLines: [line] });
    expect(caution.codes).toContain('splits_incomplete');
    expect(caution.level).toBe('warn');
  });
});

describe('refundCashierCustomerName', () => {
  it('uses refund.customer when customerName is missing', () => {
    expect(refundCashierCustomerName({ customer: 'Kaduna Sheets', customerName: '' }, null)).toBe(
      'Kaduna Sheets'
    );
  });
});

describe('actorMayOverrideRefundUnclearedPayoutHold', () => {
  it('allows admin only', () => {
    expect(actorMayOverrideRefundUnclearedPayoutHold({ roleKey: 'admin' })).toBe(true);
    expect(actorMayOverrideRefundUnclearedPayoutHold({ roleKey: 'cashier' })).toBe(false);
    expect(actorMayOverrideRefundUnclearedPayoutHold({ roleKey: 'md' })).toBe(false);
    expect(actorMayOverrideRefundUnclearedPayoutHold({ roleKey: 'finance_manager' }, (p) => p === '*')).toBe(
      true
    );
    expect(actorMayOverrideRefundUnclearedPayoutHold({ permissions: ['*'] })).toBe(true);
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

  it('subtracts overpayment already applied as credit to another quotation', () => {
    // Excess cash is 200k over quote total, but 150k of that has already been redirected as
    // credit to a different quotation (not via a refund record) — only 50k should remain.
    const residual = refundCashierOverpayResidualNgn({
      cashInNgn: 1_200_000,
      quoteTotalNgn: 1_000_000,
      excludeRefundId: 'RF-KD-26-1',
      refunds: [],
      creditAppliedOutNgn: 150_000,
    });
    expect(residual).toBe(50_000);
  });

  it('defaults creditAppliedOutNgn to 0 when omitted (no behaviour change for existing callers)', () => {
    const residual = refundCashierOverpayResidualNgn({
      cashInNgn: 1_200_000,
      quoteTotalNgn: 1_000_000,
      excludeRefundId: 'RF-KD-26-1',
      refunds: [],
    });
    expect(residual).toBe(200_000);
  });
});
