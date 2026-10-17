import { describe, expect, it } from 'vitest';
import { receiptDuplicate24hPrompt, userIsBranchManagerOrOmClient } from './financeManagerOverride.js';

describe('finance manager override (client)', () => {
  it('allows BM / OM roles only', () => {
    expect(userIsBranchManagerOrOmClient('branch_manager')).toBe(true);
    expect(userIsBranchManagerOrOmClient('Operations Manager')).toBe(true);
    expect(userIsBranchManagerOrOmClient('cashier')).toBe(false);
    expect(userIsBranchManagerOrOmClient('')).toBe(false);
  });

  it('lists the earlier receipts in the 24 h prompt', () => {
    const text = receiptDuplicate24hPrompt({
      error: 'RC-1 already records ₦250,000.',
      duplicates: [{ id: 'RC-1', quotationRef: 'QT-1', hoursApart: 3 }],
    });
    expect(text).toMatch(/RC-1 on QT-1 \(3 h apart\)/);
    expect(text).toMatch(/audit/);
  });
});
