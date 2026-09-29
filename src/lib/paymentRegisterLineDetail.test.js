import { describe, expect, it } from 'vitest';
import { buildPaymentRegisterLineDetail } from './paymentRegisterLineDetail.js';

const movements = [
  {
    id: 'TM-1',
    postedAtISO: '2026-09-29T12:00:00.000Z',
    type: 'REFUND_PAYOUT',
    amountNgn: -15000,
    accountName: 'Zarewa Aluminum & Plastics Ltd',
    bankName: 'GTBank',
    accountNo: '0123456789',
    reference: 'RF-PAY-1',
    note: 'Customer refund payout recorded',
    createdBy: 'Cashier Ada',
    sourceKind: 'REFUND',
    sourceId: 'RF-KD-26-9689',
    counterpartyName: 'Ali Cap Jos',
    reversesMovementId: '',
  },
  {
    id: 'TM-2',
    postedAtISO: '2026-09-29T13:00:00.000Z',
    type: 'REFUND_PAYOUT',
    amountNgn: -15000,
    accountName: 'Zarewa Aluminum & Plastics Ltd',
    reference: 'RF-PAY-2',
    note: '',
    createdBy: 'Cashier Ada',
    sourceKind: 'REFUND',
    sourceId: 'RF-KD-26-9689',
    counterpartyName: 'Ali Cap Jos',
    reversesMovementId: '',
  },
];

describe('buildPaymentRegisterLineDetail', () => {
  it('explains one refund debit among several till/bank legs and what is still unpaid', () => {
    const detail = buildPaymentRegisterLineDetail({
      row: {
        movementId: 'TM-1',
        sourceKind: 'REFUND',
        sourceId: 'RF-KD-26-9689',
        amountAbs: 15000,
      },
      movements,
      refund: {
        refundID: 'RF-KD-26-9689',
        customer: 'Ali Cap Jos',
        quotationRef: 'QT-100',
        reason: 'Overpayment after cutting',
        reasonCategory: 'Overpayment',
        status: 'Partially paid',
        amountNgn: 31000,
        approvedAmountNgn: 31000,
        paidAmountNgn: 30000,
        creditAppliedNgn: 0,
      },
    });

    expect(detail.amountNgn).toBe(15000);
    expect(detail.accountDetail).toBe('GTBank · 0123456789');
    expect(detail.legs).toHaveLength(2);
    expect(detail.legs.find((leg) => leg.movementId === 'TM-1')?.isThisLine).toBe(true);
    expect(detail.netLeftNgn).toBe(30000);
    expect(detail.sentences.join(' ')).toMatch(/₦15,000 from Zarewa Aluminum/);
    expect(detail.sentences.join(' ')).toMatch(/2 separate till\/bank debits/);
    expect(detail.sentences.join(' ')).toMatch(/still to pay/);
    expect(detail.facts.some((fact) => fact.value === 'QT-100')).toBe(true);
    expect(detail.canOpenSource).toBe(true);
  });

  it('nets reversal lines back out of what left the till', () => {
    const detail = buildPaymentRegisterLineDetail({
      row: { movementId: 'TM-1', sourceKind: 'REFUND', sourceId: 'RF-1', amountAbs: 15000 },
      movements: [
        movements[0],
        {
          id: 'TM-R',
          postedAtISO: '2026-09-30T12:00:00.000Z',
          type: 'REFUND_PAYOUT_REVERSAL_IN',
          amountNgn: 15000,
          accountName: 'Till',
          sourceKind: 'REFUND',
          sourceId: 'RF-KD-26-9689',
          reversesMovementId: 'TM-1',
        },
      ],
      refund: {
        refundID: 'RF-KD-26-9689',
        amountNgn: 15000,
        approvedAmountNgn: 15000,
        paidAmountNgn: 0,
        status: 'Approved',
      },
    });

    expect(detail.reversedNgn).toBe(15000);
    expect(detail.netLeftNgn).toBe(0);
    expect(detail.sentences.join(' ')).toMatch(/posted back/);
  });

  it('shows a payment request as requested, paid, and still due', () => {
    const detail = buildPaymentRegisterLineDetail({
      row: { movementId: 'TM-P', sourceKind: 'PAYMENT_REQUEST', sourceId: 'PR-9', amountAbs: 4000 },
      movements: [
        {
          id: 'TM-P',
          postedAtISO: '2026-09-01T10:00:00.000Z',
          type: 'PAYMENT_REQUEST_OUT',
          amountNgn: -4000,
          accountName: 'Till',
          sourceKind: 'PAYMENT_REQUEST',
          sourceId: 'PR-9',
          note: 'Part pay',
        },
      ],
      paymentRequest: {
        requestID: 'PR-9',
        payeeName: 'Fuel vendor',
        amountRequestedNgn: 10000,
        paidAmountNgn: 4000,
        approvalStatus: 'Approved',
        expenseCategory: 'Fuel',
        description: 'Generator diesel',
        requestedBy: 'Store',
        approvedBy: 'Manager',
      },
    });

    expect(detail.money.find((row) => row.label === 'Still to pay')?.amountNgn).toBe(6000);
    expect(detail.sentences.join(' ')).toMatch(/₦6,000 is still to pay/);
    expect(detail.facts.some((fact) => fact.value === 'Generator diesel')).toBe(true);
    expect(detail.trail.some((step) => step.label === 'Approved')).toBe(true);
  });
});
