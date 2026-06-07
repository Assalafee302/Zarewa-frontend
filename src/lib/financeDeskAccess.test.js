import { describe, it, expect } from 'vitest';
import {
  userMayViewAccountingDeskClient,
  userMayViewAccountingSectionsOnReportsClient,
  userMayViewCashierDeskClient,
  userHasLegacyFullFinanceDeskClient,
} from './financeDeskAccess.js';

describe('financeDeskAccess', () => {
  it('cashier role can view Cashier Desk', () => {
    expect(userMayViewCashierDeskClient('cashier', ['cashier.desk.view'])).toBe(true);
    expect(userMayViewCashierDeskClient('cashier', [])).toBe(true);
  });

  it('finance_manager can view Accounting Desk', () => {
    expect(userMayViewAccountingDeskClient('finance_manager', ['accounting.desk.view'])).toBe(true);
    expect(userMayViewAccountingDeskClient('finance_manager', ['finance.view', 'reports.view'])).toBe(true);
  });

  it('md can view Accounting Desk (read-only UI)', () => {
    expect(userMayViewAccountingDeskClient('md', ['accounting.desk.view'])).toBe(true);
  });

  it('cashier does not see accounting sections on Reports by default', () => {
    expect(
      userMayViewAccountingSectionsOnReportsClient('cashier', ['finance.view', 'reports.view'])
    ).toBe(false);
  });

  it('finance_manager sees accounting sections on Reports', () => {
    expect(
      userMayViewAccountingSectionsOnReportsClient('finance_manager', ['finance.view', 'reports.view'])
    ).toBe(true);
  });

  it('cashier does not have legacy full finance hat (Phase 10)', () => {
    expect(userHasLegacyFullFinanceDeskClient('cashier', ['finance.view', 'reports.view'])).toBe(false);
  });

  it('finance.pay grants Cashier Desk without role key', () => {
    expect(userMayViewCashierDeskClient('sales_staff', ['finance.pay'])).toBe(true);
  });
});
