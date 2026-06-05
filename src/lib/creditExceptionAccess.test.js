import { describe, expect, it } from 'vitest';

function canApproveCredit(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'sales_manager', 'branch_manager'].includes(rk);
}

describe('credit exception UI permissions', () => {
  it('cashier cannot approve', () => {
    expect(canApproveCredit('cashier')).toBe(false);
  });

  it('md can approve', () => {
    expect(canApproveCredit('md')).toBe(true);
  });
});
