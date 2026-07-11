import { describe, expect, it } from 'vitest';
import {
  buildProductionRegisterIssues,
  productionCoilSyncSummary,
} from './productionRegisterIssues.js';

describe('productionRegisterIssues', () => {
  it('flags unsaved coils when server has fewer than the screen', () => {
    const issues = buildProductionRegisterIssues({
      readOnly: false,
      canMutate: true,
      jobStatus: 'Running',
      unsavedCoilDraftCount: 1,
      savedCoilCount: 1,
      draftAllocations: [
        { id: 'PJC-1', coilNo: 'CL-A', openingWeightKg: '1000' },
        { id: 'draft-2', coilNo: 'CL-B', openingWeightKg: '800' },
      ],
    });
    expect(issues.some((i) => i.id === 'unsaved-coils' && i.severity === 'error')).toBe(true);
    expect(issues.find((i) => i.id === 'unsaved-coils')?.detail).toMatch(/only see 1 on the server/i);
  });

  it('skips coil nags for pure stone but not hybrid stone+flatsheet', () => {
    const pure = buildProductionRegisterIssues({
      readOnly: false,
      canMutate: true,
      jobStatus: 'Planned',
      isStoneMeterQuote: true,
      stonePureNoCoil: true,
      stoneCoilHybrid: false,
      canEditPlannedAllocations: true,
      hasPersistedCoilAllocations: false,
      unsavedCoilDraftCount: 0,
    });
    expect(pure.some((i) => i.id === 'no-coils-saved')).toBe(false);
    expect(pure.some((i) => i.id === 'stone-start')).toBe(true);

    const hybrid = buildProductionRegisterIssues({
      readOnly: false,
      canMutate: true,
      jobStatus: 'Planned',
      isStoneMeterQuote: true,
      stonePureNoCoil: false,
      stoneCoilHybrid: true,
      canEditPlannedAllocations: true,
      hasPersistedCoilAllocations: false,
      unsavedCoilDraftCount: 0,
    });
    expect(hybrid.some((i) => i.id === 'no-coils-saved')).toBe(true);
    expect(hybrid.find((i) => i.id === 'no-coils-saved')?.detail).toMatch(/flatsheet/i);
  });

  it('summarizes active job sync state for the queue', () => {
    expect(
      productionCoilSyncSummary({ savedCoilCount: 1, unsavedCoilDraftCount: 1, isActiveJob: true }).label
    ).toBe('1 saved · +1 not synced');
    expect(productionCoilSyncSummary({ savedCoilCount: 2, unsavedCoilDraftCount: 0 }).label).toBe(
      '2 coil(s) on server'
    );
  });
});
