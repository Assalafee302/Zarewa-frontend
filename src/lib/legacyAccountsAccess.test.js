import { describe, expect, it } from 'vitest';
import {
  getAllowedLegacyAccountTabs,
  getDefaultLegacyAccountTab,
  resolveLegacyAccountsRedirect,
  resolveAccountsNavigationTab,
  userMayAccessLegacyAccountsRoute,
  userMaySeeLegacyAccountsNav,
  treasuryTabShowsPayoutQueues,
  legacyAccountTabLabelForRole,
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
    expect(getAllowedLegacyAccountTabs('cashier', ['cashier.desk.view'])).not.toContain('disbursements');
    expect(resolveLegacyAccountsRedirect('cashier', ['cashier.desk.view'], 'audit')?.to).toBe(
      '/accounts?tab=desk'
    );
    expect(resolveLegacyAccountsRedirect('cashier', ['cashier.desk.view'], 'disbursements')?.to).toBe(
      '/accounts?tab=desk'
    );
  });

  it('cashier treasury tab resolves to Finance desk and is not in allowed tabs', () => {
    expect(treasuryTabShowsPayoutQueues('cashier')).toBe(false);
    expect(treasuryTabShowsPayoutQueues('finance_manager')).toBe(true);
    expect(getAllowedLegacyAccountTabs('cashier', ['cashier.desk.view'])).not.toContain('treasury');
    expect(resolveAccountsNavigationTab('treasury', 'cashier', ['cashier.desk.view'])).toBe('desk');
    expect(resolveAccountsNavigationTab('treasury', 'finance_manager', ['accounting.desk.view'])).toBe('desk');
    expect(legacyAccountTabLabelForRole('desk', 'cashier')).toBe('Finance desk');
    expect(resolveLegacyAccountsRedirect('cashier', ['cashier.desk.view'], 'treasury')).toBeNull();
  });

  it('resolveAccountsNavigationTab maps forbidden tabs to role default', () => {
    expect(resolveAccountsNavigationTab('disbursements', 'cashier', ['cashier.desk.view'])).toBe('desk');
    expect(resolveAccountsNavigationTab('requests', 'cashier', ['cashier.desk.view'])).toBe('desk');
    expect(resolveAccountsNavigationTab('disbursements', 'finance_manager', ['accounting.desk.view'])).toBe(
      'disbursements'
    );
    expect(resolveAccountsNavigationTab('desk', 'cashier', ['cashier.desk.view'])).toBe('desk');
  });

  it('accountant sees Finance desk and accounting tabs', () => {
    expect(userMayAccessLegacyAccountsRoute('finance_manager', ['accounting.desk.view'])).toBe(true);
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).toContain('desk');
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).toContain('audit');
    expect(getAllowedLegacyAccountTabs('finance_manager', ['accounting.desk.view'])).not.toContain('treasury');
    expect(getDefaultLegacyAccountTab('finance_manager', ['accounting.desk.view'])).toBe('desk');
  });
});
