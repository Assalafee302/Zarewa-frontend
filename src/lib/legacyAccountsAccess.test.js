import { describe, expect, it } from 'vitest';
import {
  getAllowedLegacyAccountTabs,
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

  it('cashier limited tabs and nav hidden', () => {
    expect(userMaySeeLegacyAccountsNav('cashier', ['cashier.desk.view', 'finance.view'])).toBe(false);
    expect(getAllowedLegacyAccountTabs('cashier', ['cashier.desk.view'])).not.toContain('audit');
    expect(resolveLegacyAccountsRedirect('cashier', ['cashier.desk.view'], 'audit')?.to).toBe('/cashier');
  });

  it('accountant sees accounting tabs', () => {
    expect(userMayAccessLegacyAccountsRoute('finance_manager', ['accounting.desk.view'])).toBe(true);
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).toContain('audit');
  });

});
