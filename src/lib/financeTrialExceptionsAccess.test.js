import { describe, expect, it } from 'vitest';
import {
  userMayViewFinanceTrialExceptionsClient,
  userMayViewFinanceTrialOversightClient,
  userMayViewAp2SupplierDiagnosticsClient,
} from './financeTrialExceptionsAccess.js';

describe('financeTrialExceptionsAccess', () => {
  it('allows finance desk roles', () => {
    expect(userMayViewFinanceTrialExceptionsClient('cashier', [])).toBe(true);
    expect(userMayViewFinanceTrialExceptionsClient('finance_manager', [])).toBe(true);
  });

  it('restricts oversight to MD and audit', () => {
    expect(userMayViewFinanceTrialOversightClient('md', [])).toBe(true);
    expect(userMayViewFinanceTrialOversightClient('cashier', [])).toBe(false);
    expect(userMayViewFinanceTrialOversightClient('viewer', ['audit.view'])).toBe(true);
  });

  it('AP2a diagnostics excludes cashier-only', () => {
    expect(userMayViewAp2SupplierDiagnosticsClient('cashier', [])).toBe(false);
    expect(userMayViewAp2SupplierDiagnosticsClient('finance_manager', [])).toBe(true);
    expect(userMayViewAp2SupplierDiagnosticsClient('viewer', ['finance.view'])).toBe(true);
    expect(userMayViewAp2SupplierDiagnosticsClient('viewer', ['procurement.view'])).toBe(true);
  });
});
