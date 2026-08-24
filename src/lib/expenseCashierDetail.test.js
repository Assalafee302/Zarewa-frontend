import { describe, expect, it } from 'vitest';
import {
  expenseCashierMoneyStory,
  expenseCashierTreasuryPayouts,
  findSimilarPaymentRequests,
  postedExpenseToCashierRequest,
  resolveExpenseCashierTarget,
  similarPaymentRequestReason,
} from './expenseCashierDetail.js';

const diesel = {
  requestID: 'PR-1',
  payeeName: 'NNPC Depot',
  payeeAccountNo: '0123456789',
  amountRequestedNgn: 80_000,
  paidAmountNgn: 0,
  requestDate: '2026-08-20',
  description: 'Diesel for generator',
  expenseCategory: 'Fuel & lubricant',
  approvalStatus: 'Approved',
};

describe('expenseCashierDetail', () => {
  it('splits requested / paid / still due', () => {
    expect(expenseCashierMoneyStory({ amountRequestedNgn: 10000, paidAmountNgn: 2500 })).toEqual({
      requestedNgn: 10000,
      paidNgn: 2500,
      dueNgn: 7500,
    });
  });

  it('flags same payee+amount even on a different day (paid vs still to pay)', () => {
    const paidTwin = {
      requestID: 'PR-2',
      payeeName: 'nnpc  depot',
      amountRequestedNgn: 80_000,
      paidAmountNgn: 80_000,
      requestDate: '2026-08-18',
      approvalStatus: 'Approved',
    };
    expect(similarPaymentRequestReason(diesel, paidTwin)).toBe('Same payee and amount');
    const hits = findSimilarPaymentRequests(diesel, [diesel, paidTwin]);
    expect(hits).toHaveLength(1);
    expect(hits[0].request.requestID).toBe('PR-2');
  });

  it('flags same memo+amount and same work order', () => {
    expect(
      similarPaymentRequestReason(diesel, {
        requestID: 'PR-3',
        description: 'Diesel for generator',
        amountRequestedNgn: 80_000,
        approvalStatus: 'Approved',
      })
    ).toBe('Same memo and amount');
    expect(
      similarPaymentRequestReason(
        { ...diesel, maintenanceWorkOrderId: 'MWO-44' },
        { requestID: 'PR-4', maintenanceWorkOrderId: 'MWO-44', amountRequestedNgn: 12, approvalStatus: 'Approved' }
      )
    ).toBe('Same work order');
  });

  it('ignores rejected twins and the open request itself', () => {
    expect(
      similarPaymentRequestReason(diesel, {
        requestID: 'PR-x',
        payeeName: 'NNPC Depot',
        amountRequestedNgn: 80_000,
        approvalStatus: 'Rejected',
      })
    ).toBeNull();
    expect(findSimilarPaymentRequests(diesel, [diesel])).toEqual([]);
  });

  it('resolves a paid treasury line via expense id when no request id is on the movement', () => {
    const pr = { ...diesel, expenseID: 'EXP-9' };
    expect(
      resolveExpenseCashierTarget({
        expenseId: 'EXP-9',
        paymentRequests: [pr],
        expenses: [{ expenseID: 'EXP-9', amountNgn: 80_000, category: 'Fuel' }],
      })?.requestID
    ).toBe('PR-1');
    expect(
      resolveExpenseCashierTarget({
        expenseId: 'EXP-9',
        paymentRequests: [],
        expenses: [{ expenseID: 'EXP-9', amountNgn: 80_000, category: 'Fuel', date: '2026-08-21' }],
      })
    ).toMatchObject({
      expenseID: 'EXP-9',
      postedExpenseOnly: true,
      paidAmountNgn: 80_000,
    });
  });

  it('maps posted expense cards and treasury payouts', () => {
    expect(postedExpenseToCashierRequest({ expenseID: 'EXP-1', amountNgn: 500, category: 'Admin' }).requestID).toBe('');
    expect(
      expenseCashierTreasuryPayouts('PR-1', [
        { sourceKind: 'PAYMENT_REQUEST', sourceId: 'PR-1', amountNgn: 80_000 },
        { sourceKind: 'EXPENSE', sourceId: 'EXP-9', amountNgn: 10 },
      ])
    ).toHaveLength(1);
  });
});
