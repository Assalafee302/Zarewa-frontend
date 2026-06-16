import { describe, expect, it } from 'vitest';
import { myProfileOverviewFetchPlan } from './myProfileOverviewFetch.js';

describe('myProfileOverviewFetchPlan', () => {
  it('skips all dashboard fetches for scholarship (separate school hub)', () => {
    expect(myProfileOverviewFetchPlan('scholarship')).toEqual({
      leaveBalances: false,
      payslips: false,
      requests: false,
    });
  });

  it('skips all dashboard fetches for domestic (separate pay hub)', () => {
    expect(myProfileOverviewFetchPlan('domestic')).toEqual({
      leaveBalances: false,
      payslips: false,
      requests: false,
    });
  });

  it('fetches leave only for employee and special cohorts', () => {
    expect(myProfileOverviewFetchPlan('employee').leaveBalances).toBe(true);
    expect(myProfileOverviewFetchPlan('special').leaveBalances).toBe(true);
  });

  it('fetches payslips and requests for employee and special cohorts', () => {
    for (const cohort of ['employee', 'special']) {
      const plan = myProfileOverviewFetchPlan(cohort);
      expect(plan.payslips).toBe(true);
      expect(plan.requests).toBe(true);
    }
  });
});
