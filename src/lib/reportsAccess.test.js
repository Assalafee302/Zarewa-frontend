import { describe, it, expect } from 'vitest';
import { userMayViewManagementReportsClient } from './reportsAccess.js';

describe('userMayViewManagementReportsClient', () => {
  it('allows finance_manager with reports.view', () => {
    expect(userMayViewManagementReportsClient('finance_manager', ['reports.view', 'finance.view'])).toBe(true);
  });

  it('denies finance_manager without reports.view', () => {
    expect(userMayViewManagementReportsClient('finance_manager', ['finance.view'])).toBe(false);
  });
});
