import { describe, expect, it } from 'vitest';
import {
  materialTransactionHasRows,
  paidExpensesInRange,
  purchaseRegisterHasRows,
  rowsPeriodCostsInventoryPack,
} from './reportsPackRows';

describe('reportsPackRows', () => {
  it('paidExpensesInRange excludes rejected payment requests', () => {
    const expenses = [
      { expenseID: 'EX-1', date: '2026-03-10', amountNgn: 50_000, category: 'Ops', expenseType: 'Fuel' },
    ];
    const paymentRequests = [
      {
        expenseID: 'EX-1',
        amountRequestedNgn: 50_000,
        paidAmountNgn: 0,
        approvalStatus: 'Rejected',
      },
    ];
    expect(paidExpensesInRange(expenses, paymentRequests, '2026-03-01', '2026-03-31')).toHaveLength(0);
  });

  it('paidExpensesInRange includes approved expenses with partial payout', () => {
    const expenses = [
      { expenseID: 'EX-2', date: '2026-03-12', amountNgn: 100_000, category: 'Ops', expenseType: 'Repairs' },
    ];
    const paymentRequests = [
      {
        expenseID: 'EX-2',
        amountRequestedNgn: 100_000,
        paidAmountNgn: 40_000,
        approvalStatus: 'Approved',
      },
    ];
    const rows = paidExpensesInRange(expenses, paymentRequests, '2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(1);
    expect(rows[0].paidAmountNgn).toBe(40_000);
    expect(rows[0].remainingAmountNgn).toBe(60_000);
  });

  it('rowsPeriodCostsInventoryPack tags sections', () => {
    const expenses = [
      { expenseID: 'EX-3', date: '2026-03-05', amountNgn: 10_000, category: 'Admin', expenseType: 'Stationery' },
    ];
    const rows = rowsPeriodCostsInventoryPack(expenses, [], [], [], '2026-03-01', '2026-03-31');
    expect(rows.some((r) => r.packSection === 'Expenses' && r.expenseID === 'EX-3')).toBe(true);
  });

  it('materialTransactionHasRows is false for null or bare report', () => {
    expect(materialTransactionHasRows(null)).toBe(false);
    expect(materialTransactionHasRows({})).toBe(false);
  });

  it('materialTransactionHasRows is true when summary has materials', () => {
    expect(
      materialTransactionHasRows({
        summary: { byMaterial: [{ label: 'Aluminium', lineCount: 2 }] },
      })
    ).toBe(true);
  });

  it('purchaseRegisterHasRows respects summary materials', () => {
    expect(purchaseRegisterHasRows({ summary: { byMaterial: [{ label: 'Coil' }] } })).toBe(true);
    expect(purchaseRegisterHasRows({})).toBe(false);
  });
});
