import { describe, expect, it } from 'vitest';
import { remainingCashAfterDraw } from './chairmanOfficeMath.js';
import { userMayAccessChairmanOfficeClient } from './chairmanOfficeAccess.js';

describe('chairmanOfficeMath', () => {
  it('subtracts pending and requested drawings from cash', () => {
    expect(remainingCashAfterDraw(5_000_000, 1_000_000, 250_000)).toBe(3_750_000);
  });

  it('treats pending family payouts the same as pending drawings', () => {
    expect(remainingCashAfterDraw(2_000_000, 1_200_000 + 400_000, 100_000)).toBe(300_000);
  });
});

describe('chairmanOfficeAccess', () => {
  it('allows chairman, MD, and admin', () => {
    expect(userMayAccessChairmanOfficeClient('chairman', ['exec.dashboard.view'])).toBe(true);
    expect(userMayAccessChairmanOfficeClient('md', [])).toBe(true);
    expect(userMayAccessChairmanOfficeClient('admin', ['*'])).toBe(true);
  });

  it('keeps CEO on Command Centre', () => {
    expect(userMayAccessChairmanOfficeClient('ceo', ['exec.dashboard.view'])).toBe(false);
  });
});
