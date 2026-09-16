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
        unitPrice: '4000',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out).toBe(rows);
  });

  it('defaults unit price to floor and stamps list on recommended', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '' }];
    const resolveUnitPrice = vi.fn(() => 4000);
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
    expect(once[0].unitPrice).toBe('4000');
    expect(once[0].floorPricePerMeter).toBe(4000);
    expect(once[0].recommendedPricePerMeter).toBe(4500);

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
        unitPrice: '4000',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4000,
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
    let rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '4000' }];
    const ctx = {
      options,
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    };
    rows = applyWorkbookPricesToProductRows(rows, ctx);
    const stable = rows;
    for (let i = 0; i < 40; i += 1) {
      rows = applyWorkbookPricesToProductRows(rows, ctx);
      expect(rows).toBe(stable);
    }
  });

  it('preserves unit price edited above the floor', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '5200',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out).toBe(rows);
    expect(out[0].unitPrice).toBe('5200');
  });

  it('preserves a custom price while refreshing floor/list meta', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '5200',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4200,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4200, suggestedListPerMeter: 4800 }),
    });
    expect(out).not.toBe(rows);
    expect(out[0].unitPrice).toBe('5200');
    expect(out[0].floorPricePerMeter).toBe(4200);
    expect(out[0].recommendedPricePerMeter).toBe(4800);
  });

  it('rolls forward when the line is still on the previous floor default', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '4000',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4200,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4200, suggestedListPerMeter: 4800 }),
    });
    expect(out[0].unitPrice).toBe('4200');
    expect(out[0].floorPricePerMeter).toBe(4200);
    expect(out[0].recommendedPricePerMeter).toBe(4800);
  });

  it('does not roll floor forward on existing quotes after a later publish', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '4000',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4200,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4200, suggestedListPerMeter: 4800 }),
      rollForwardFloorDefaults: false,
    });
    expect(out[0].unitPrice).toBe('4000');
    expect(out[0].floorPricePerMeter).toBe(4000);
  });

  it('preserves below-floor custom prices (MD approval path)', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '3800',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out).toBe(rows);
    expect(out[0].unitPrice).toBe('3800');
  });

  it('preserves saved custom prices that have no recommended meta yet', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '5100' }];
    const out = applyWorkbookPricesToProductRows(rows, {
      options,
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out[0].unitPrice).toBe('5100');
    expect(out[0].floorPricePerMeter).toBe(4000);
    expect(out[0].recommendedPricePerMeter).toBe(4500);
  });

  it('does not treat a prior list-priced line as floor-tracking after policy change', () => {
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
      resolveUnitPrice: () => 4000,
      resolveWorkbookLineMeta: () => ({ floorPerMeter: 4000, suggestedListPerMeter: 4500 }),
    });
    expect(out[0].unitPrice).toBe('4500');
  });
});
