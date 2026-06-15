import { describe, expect, it } from 'vitest';
import { canApproveProductionGate, productionGateOverrideNoteValid } from './productionGateAccess.js';
import { canApproveCreditExceptionItem } from './creditExceptionAccess.js';

describe('production gate access', () => {
  it('branch manager and md may override production gate', () => {
    expect(canApproveProductionGate('sales_manager')).toBe(true);
    expect(canApproveProductionGate('md')).toBe(true);
    expect(canApproveProductionGate('sales_staff')).toBe(false);
  });

  it('requires 8+ character override note', () => {
    expect(productionGateOverrideNoteValid('short')).toBe(false);
    expect(productionGateOverrideNoteValid('long enough reason')).toBe(true);
  });
});

describe('credit exception UI permissions', () => {
  const policy = {
    branchManagerLimitNgn: 5_000_000,
    mdRequiredAboveNgn: 10_000_000,
    branchLimitConfigured: true,
    mdThresholdConfigured: true,
  };

  it('cashier cannot approve', () => {
    expect(canApproveCreditExceptionItem('cashier', { amountNgn: 1_000_000 }, policy)).toBe(false);
  });

  it('md can approve any amount', () => {
    expect(canApproveCreditExceptionItem('md', { amountNgn: 20_000_000 }, policy)).toBe(true);
  });

  it('branch manager only within branch limit', () => {
    expect(canApproveCreditExceptionItem('sales_manager', { amountNgn: 3_000_000 }, policy)).toBe(true);
    expect(canApproveCreditExceptionItem('sales_manager', { amountNgn: 12_000_000 }, policy)).toBe(false);
  });
});
