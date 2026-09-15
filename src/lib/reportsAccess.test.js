import { describe, it, expect } from 'vitest';
import {
  userMayAccessBranchCommandCentreClient,
  userMayAccessExecutiveCommandCentreClient,
  userMayViewManagementReportsClient,
} from './reportsAccess.js';

describe('userMayViewManagementReportsClient', () => {
  it('allows finance_manager with reports.view', () => {
    expect(userMayViewManagementReportsClient('finance_manager', ['reports.view', 'finance.view'])).toBe(true);
  });

  it('denies finance_manager without reports.view', () => {
    expect(userMayViewManagementReportsClient('finance_manager', ['finance.view'])).toBe(false);
  });

  it('allows chairman with reports.view', () => {
    expect(userMayViewManagementReportsClient('chairman', ['reports.view', 'exec.dashboard.view'])).toBe(true);
  });
});

describe('command centre access', () => {
  it('branch managers do not get /exec intelligence shortcut', () => {
    expect(
      userMayAccessBranchCommandCentreClient('sales_manager', ['dashboard.view', 'reports.view', 'sales.manage'])
    ).toBe(false);
  });

  it('exec command centre requires exec.dashboard.view', () => {
    expect(userMayAccessExecutiveCommandCentreClient(['dashboard.view'])).toBe(false);
    expect(userMayAccessExecutiveCommandCentreClient(['exec.dashboard.view'])).toBe(true);
  });
});
