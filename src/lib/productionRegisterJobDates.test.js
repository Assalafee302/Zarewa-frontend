import { describe, expect, it } from 'vitest';
import { productionDatesFromJob } from './productionRegisterJobDates.js';

describe('productionDatesFromJob', () => {
  it('uses server start date instead of today after production starts', () => {
    const dates = productionDatesFromJob({
      startDateISO: '2026-06-15',
      completedAtISO: null,
    });
    expect(dates.productionDateIso).toBe('2026-06-15');
    expect(dates.completionDateIso).toBe('2026-06-15');
  });

  it('prefers completion date when job is finished', () => {
    const dates = productionDatesFromJob({
      startDateISO: '2026-06-15',
      completedAtISO: '2026-06-18',
    });
    expect(dates.productionDateIso).toBe('2026-06-15');
    expect(dates.completionDateIso).toBe('2026-06-18');
  });
});
