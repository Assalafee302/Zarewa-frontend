import { describe, expect, it } from 'vitest';
import {
  coilAllocationDraftStorageKey,
  coilDraftRowsWithData,
  draftRowConversionPreviewReady,
  isEmptyCoilDraftRow,
  seedDraftAllocationsFromServer,
} from './productionRegisterCoilDraft.js';

describe('productionRegisterCoilDraft', () => {
  it('treats trailing blank draft row as empty placeholder', () => {
    const blank = {
      id: 'draft-1',
      coilNo: '',
      openingWeightKg: '',
      closingWeightKg: '',
      metersProduced: '',
      note: '',
    };
    expect(isEmptyCoilDraftRow(blank)).toBe(true);
    expect(coilDraftRowsWithData([blank])).toEqual([]);
  });

  it('validates filled rows even when a blank draft row follows', () => {
    const filled = {
      id: 'line-1',
      coilNo: 'CL-2043',
      openingWeightKg: '800',
      closingWeightKg: '120',
      metersProduced: '450',
      note: '',
    };
    const blank = {
      id: 'draft-2',
      coilNo: '',
      openingWeightKg: '',
      closingWeightKg: '',
      metersProduced: '',
      note: '',
    };
    const rows = coilDraftRowsWithData([filled, blank]);
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => draftRowConversionPreviewReady(r))).toBe(true);
  });

  it('parses comma-separated kg and metres on draft rows', () => {
    expect(
      draftRowConversionPreviewReady({
        id: 'line-2',
        coilNo: 'CL-99',
        openingWeightKg: '1,200',
        closingWeightKg: '100',
        metersProduced: '1,050.5',
        note: '',
      })
    ).toBe(true);
  });

  it('uses stable draft row id for session storage keys', () => {
    const row = {
      id: 'draft-abc',
      coilNo: 'CL-1',
      openingWeightKg: '500',
      closingWeightKg: '',
      metersProduced: '',
      note: '',
    };
    expect(coilAllocationDraftStorageKey(row)).toBe('draft:draft-abc');
  });

  it('seedDraftAllocationsFromServer keeps unsaved second coil when server has only first coil', () => {
    const serverRows = [
      {
        id: 'PJC-1',
        coilNo: 'CL-FIRST',
        openingWeightKg: 1000,
        closingWeightKg: 0,
        metersProduced: 0,
        note: '',
      },
    ];
    const prev = [
      {
        id: 'PJC-1',
        coilNo: 'CL-FIRST',
        openingWeightKg: '1000',
        closingWeightKg: '',
        metersProduced: '',
        note: '',
      },
      {
        id: 'draft-second',
        coilNo: 'CL-SECOND',
        openingWeightKg: '800',
        closingWeightKg: '',
        metersProduced: '',
        note: '',
      },
    ];
    const seeded = seedDraftAllocationsFromServer('PRO-1', serverRows, prev, false);
    const coils = seeded.filter((r) => String(r.coilNo ?? '').trim());
    expect(coils.map((r) => r.coilNo)).toEqual(['CL-FIRST', 'CL-SECOND']);
  });
});
