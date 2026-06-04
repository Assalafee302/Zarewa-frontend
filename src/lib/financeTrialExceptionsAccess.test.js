import { describe, expect, it } from 'vitest';
import {
  userMayViewFinanceTrialExceptionsClient,
  userMayViewFinanceTrialOversightClient,
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
});
