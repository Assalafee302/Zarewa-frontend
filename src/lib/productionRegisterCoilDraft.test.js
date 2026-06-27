import { describe, expect, it } from 'vitest';
import {
  coilDraftRowsWithData,
  draftRowConversionPreviewReady,
  isEmptyCoilDraftRow,
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
});
