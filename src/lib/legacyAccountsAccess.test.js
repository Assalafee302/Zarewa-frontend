import { describe, expect, it } from 'vitest';
import {
  getAllowedLegacyAccountTabs,
  getDefaultLegacyAccountTab,
  resolveLegacyAccountsRedirect,
  userMayAccessLegacyAccountsRoute,
  userMaySeeLegacyAccountsNav,
} from './legacyAccountsAccess.js';

describe('legacyAccountsAccess (client)', () => {
  it('branch manager redirected from /accounts', () => {
    expect(userMayAccessLegacyAccountsRoute('sales_manager', ['finance.approve'])).toBe(false);
    expect(resolveLegacyAccountsRedirect('sales_manager', ['finance.approve'])?.to).toBe('/manager');
    expect(userMaySeeLegacyAccountsNav('sales_manager', ['finance.approve'])).toBe(false);
  });

  it('cashier sees Cashier desk nav and defaults to desk tab', () => {
    expect(userMaySeeLegacyAccountsNav('cashier', ['cashier.desk.view', 'finance.view'])).toBe(true);
    expect(getDefaultLegacyAccountTab('cashier', ['cashier.desk.view'])).toBe('desk');
    expect(getAllowedLegacyAccountTabs('cashier', ['cashier.desk.view'])).toContain('desk');
    expect(getAllowedLegacyAccountTabs('cashier', ['cashier.desk.view'])).not.toContain('audit');
    expect(resolveLegacyAccountsRedirect('cashier', ['cashier.desk.view'], 'audit')?.to).toBe(
      '/accounts?tab=desk'
    );
  });

  it('accountant sees accounting tabs but not desk', () => {
    expect(userMayAccessLegacyAccountsRoute('finance_manager', ['accounting.desk.view'])).toBe(true);
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).toContain('audit');
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).not.toContain('desk');
    expect(getDefaultLegacyAccountTab('finance_manager', ['accounting.desk.view'])).toBe('treasury');
  });
});
