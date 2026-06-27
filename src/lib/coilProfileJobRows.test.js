import { describe, it, expect } from 'vitest';
import {
  resolveCoilJobKgUsed,
  buildCoilProfileJobRows,
  coilProfileProductionTotals,
} from './coilProfileJobRows.js';

describe('resolveCoilJobKgUsed', () => {
  it('prefers consumedWeightKg over opening minus closing', () => {
    expect(
      resolveCoilJobKgUsed({ consumedWeightKg: 15, openingWeightKg: 1633, closingWeightKg: 1600 })
    ).toBe(15);
  });

  it('falls back to opening minus closing', () => {
    expect(resolveCoilJobKgUsed({ openingWeightKg: 500, closingWeightKg: 300 })).toBe(200);
  });
});

describe('buildCoilProfileJobRows', () => {
  it('enriches cutting list and status from production jobs snapshot', () => {
    const rows = buildCoilProfileJobRows({
      holders: [{ jobID: 'PRO-1', openingWeightKg: 100, closingWeightKg: 80, consumedWeightKg: 20 }],
      productionJobs: [{ jobID: 'PRO-1', cuttingListId: 'CL-1', status: 'Completed' }],
      checkByKey: new Map([['PRO-1', { alertState: 'Watch', actualConversionKgPerM: 2 }]]),
    });
    expect(rows[0].cuttingListId).toBe('CL-1');
    expect(rows[0].jobStatus).toBe('Completed');
    expect(rows[0].alertState).toBe('Watch');
    expect(rows[0].kgUsed).toBe(20);
  });
});

describe('coilProfileProductionTotals', () => {
  it('computes gap between job sum and book used', () => {
    const jobRows = [{ consumedWeightKg: 15 }, { consumedWeightKg: 89 }];
    const t = coilProfileProductionTotals(jobRows, 100);
    expect(t.jobsConsumedKgSum).toBe(104);
    expect(t.gapKg).toBe(4);
  });
});
