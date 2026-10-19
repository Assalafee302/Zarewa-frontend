import { describe, expect, it } from 'vitest';
import { askOverQuoteReason, receiptDuplicate24hPrompt, userIsBranchManagerOrOmClient } from './financeManagerOverride.js';

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

describe('askOverQuoteReason (A5)', () => {
  const data = { code: 'PAYOUT_ABOVE_QUOTE', error: 'Haulage on PO-1 is above the quoted fee.' };
  it('tells a cashier who can approve', () => {
    expect(askOverQuoteReason(data, 'cashier', () => 'x'.repeat(20))).toEqual({ error: data.error });
  });
  it('takes a BM/OM reason, refusing a short one', () => {
    expect(askOverQuoteReason(data, 'branch_manager', () => 'Extra trip to the Zaria depot')).toEqual({
      reason: 'Extra trip to the Zaria depot',
    });
    expect(askOverQuoteReason(data, 'branch_manager', () => 'ok').error).toMatch(/manager reason/);
  });
});
