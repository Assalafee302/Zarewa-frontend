import { describe, expect, it } from 'vitest';
import {
  conversionAlertCopy,
  conversionPrimaryDelta,
  conversionReferenceRows,
  pickCoilNo,
  pickJobId,
} from './conversionReviewUi.js';

describe('conversionAlertCopy', () => {
  it('explains High in plain language', () => {
    const copy = conversionAlertCopy('High');
    expect(copy.headline).toMatch(/High conversion/i);
    expect(copy.meaning).toMatch(/more kg per metre/i);
    expect(copy.tone).toBe('rose');
  });

  it('explains Low in plain language', () => {
    expect(conversionAlertCopy('Low').tone).toBe('amber');
    expect(conversionAlertCopy('OK').tone).toBe('emerald');
  });
});

describe('conversionReferenceRows', () => {
  it('computes actual vs standard % and keeps readable labels', () => {
    const rows = conversionReferenceRows({
      actual_conversion_kg_per_m: 4.62,
      standard_conversion_kg_per_m: 4.2,
      supplier_conversion_kg_per_m: 4.1,
    });
    expect(rows[0].label).toBe('Standard');
    expect(rows[0].pct).toBeCloseTo(10, 5);
    expect(rows[0].pctLabel).toBe('+10.0%');
    expect(rows[1].label).toBe('Supplier PO');
  });

  it('reads camelCase snapshot fields', () => {
    const delta = conversionPrimaryDelta({
      actualConversionKgPerM: 3.78,
      standardConversionKgPerM: 4.2,
    });
    expect(delta.pct).toBeCloseTo(-10, 5);
    expect(delta.pctLabel).toBe('−10.0%');
  });
});

describe('pick ids', () => {
  it('accepts snake and camel job / coil keys', () => {
    expect(pickJobId({ jobID: 'JOB-1' })).toBe('JOB-1');
    expect(pickCoilNo({ coilNo: 'C-9' })).toBe('C-9');
  });
});
