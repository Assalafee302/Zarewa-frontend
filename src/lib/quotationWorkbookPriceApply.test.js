import { describe, it, expect, vi } from 'vitest';
import {
  applyWorkbookPricesToProductRows,
  productUsesWorkbookAutoPrice,
} from './quotationWorkbookPriceApply.js';

describe('productUsesWorkbookAutoPrice', () => {
  it('covers meter sheet, cladding, and trim lines', () => {
    expect(productUsesWorkbookAutoPrice('Roofing Sheet')).toBe(true);
    expect(productUsesWorkbookAutoPrice('Flat Sheet')).toBe(true);
    expect(productUsesWorkbookAutoPrice('Cladding')).toBe(true);
    expect(productUsesWorkbookAutoPrice('Ridge Cap')).toBe(true);
    expect(productUsesWorkbookAutoPrice('Flashings')).toBe(false);
    expect(productUsesWorkbookAutoPrice('Screw')).toBe(false);
  });
});

describe('applyWorkbookPricesToProductRows', () => {
  const options = [{ name: 'Roofing Sheet', defaultUnitPriceNgn: 100 }];

  it('returns the same array reference when prices are already applied', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '4500',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4500,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out).toBe(rows);
  });

  it('updates once when workbook price differs, then stabilizes', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '' }];
    const resolveUnitPrice = vi.fn(() => 4500);
    const resolveWorkbookLineMeta = vi.fn(() => ({
      floorPerMeter: 4000,
      suggestedListPerMeter: 4500,
    }));

    const once = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice,
      resolveWorkbookLineMeta,
    });
    expect(once).not.toBe(rows);
    expect(once[0].unitPrice).toBe('4500');
    expect(once[0].floorPricePerMeter).toBe(4000);

    const twice = applyWorkbookPricesToProductRows(once, {
      options,
      resolveUnitPrice,
      resolveWorkbookLineMeta,
    });
    expect(twice).toBe(once);
  });

  it('does not thrash when meta is absent on refresh but price matches', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '4500',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4500,
      resolveWorkbookLineMeta: () => null,
    });
    expect(out).toBe(rows);
  });

  it('ignores non-workbook products', () => {
    const rows = [{ id: '1', name: 'Screw', unitPrice: '10' }];
    const out = applyWorkbookPricesToProductRows(rows, {
      options: [{ name: 'Screw' }],
      resolveUnitPrice: () => 99,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 1, suggestedListPerMeter: 99 }),
    });
    expect(out).toBe(rows);
  });

  it('survives repeated apply cycles without allocating new arrays (React #185 guard)', () => {
    let rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '4500' }];
    const ctx = {
      options,
      resolveUnitPrice: () => 4500,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    };
    // First apply may attach floor/recommended meta.
    rows = applyWorkbookPricesToProductRows(rows, ctx);
    const stable = rows;
    for (let i = 0; i < 40; i += 1) {
      rows = applyWorkbookPricesToProductRows(rows, ctx);
      expect(rows).toBe(stable);
    }
  });
});
