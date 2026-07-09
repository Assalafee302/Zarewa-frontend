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

  it('summarizes active job sync state for the queue', () => {
    expect(
      productionCoilSyncSummary({ savedCoilCount: 1, unsavedCoilDraftCount: 1, isActiveJob: true }).label
    ).toBe('1 saved · +1 not synced');
    expect(productionCoilSyncSummary({ savedCoilCount: 2, unsavedCoilDraftCount: 0 }).label).toBe(
      '2 coil(s) on server'
    );
  });
});
