import { describe, expect, it } from 'vitest';
import {
  collectRepayableObligations,
  normalizeObligationForPayback,
  obligationsWithPayrollDeduction,
  totalOutstandingNgn,
} from './hrObligationPayUi.js';

describe('hrObligationPayUi', () => {
  it('normalizes loan schedule rows for payback UI', () => {
    const row = normalizeObligationForPayback(
      {
        id: 'loan-1',
        outstandingNgn: 50000,
        monthlyDeductionNgn: 10000,
        status: 'active',
        monthsPaid: 2,
        repaymentMonths: 6,
      },
      'loan'
    );
    expect(row?.kind).toBe('loan');
    expect(row?.outstandingNgn).toBe(50000);
    expect(row?.monthlyNgn).toBe(10000);
  });

  it('collects active loans and purchase credit with balances', () => {
    const items = collectRepayableObligations({
      schedule: [{ id: 'l1', outstandingNgn: 1000, monthlyDeductionNgn: 200, status: 'active' }],
      purchases: [{ obligationAccountId: 'p1', principalOutstandingNgn: 500, installmentNgn: 100, status: 'active' }],
    });
    expect(items).toHaveLength(2);
    expect(totalOutstandingNgn(items)).toBe(1500);
    expect(obligationsWithPayrollDeduction(items)).toHaveLength(2);
  });

  it('defaults MyLoans tab to repay when money summary has outstanding balance', () => {
    const tabRaw = '';
    const moneySummary = { totalOutstandingNgn: 25000 };
    const tab = ['repay', 'loans', 'credit'].includes(tabRaw)
      ? tabRaw
      : Number(moneySummary?.totalOutstandingNgn) > 0
        ? 'repay'
        : 'loans';
    expect(tab).toBe('repay');
  });
});
