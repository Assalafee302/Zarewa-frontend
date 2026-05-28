import { describe, expect, it } from 'vitest';
import { daysBetweenIso, currentPeriodYyyymm, hrRequestReviewPath } from './hrRequests.js';

describe('hrRequests', () => {
  it('daysBetweenIso counts inclusive calendar days', () => {
    expect(daysBetweenIso('2026-05-01', '2026-05-03')).toBe(3);
    expect(daysBetweenIso('2026-05-03', '2026-05-01')).toBeNull();
  });

  it('hrRequestReviewPath maps status to endpoint', () => {
    expect(hrRequestReviewPath('HRR1', 'hr_review')).toContain('/hr-review');
    expect(hrRequestReviewPath('HRR1', 'approved')).toBeNull();
  });

  it('currentPeriodYyyymm is six digits', () => {
    expect(currentPeriodYyyymm()).toMatch(/^\d{6}$/);
  });
});
