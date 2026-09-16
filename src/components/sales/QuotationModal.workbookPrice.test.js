import { describe, it, expect } from 'vitest';
import { applyWorkbookPricesToProductRows } from '../../lib/quotationWorkbookPriceApply.js';

/**
 * QuotationModal refreshWorkbookProductPrices must not rewrite productRows
 * when prices are unchanged (that loop was React #185 on product select).
 * Default unit = branch workbook floor.
 */
describe('quotation workbook price refresh', () => {
  const ctx = (floor, list = floor + 500) => ({
    options: [{ name: 'Roofing Sheet' }],
    resolveUnitPrice: () => floor,
    resolveWorkbookLineMeta: () => ({ floorPerMeter: floor, suggestedListPerMeter: list }),
  });

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
    const out = applyWorkbookPricesToProductRows(rows, ctx(4000, 4500));
    expect(out).toBe(rows);
  });

  it('stamps recommended from list while defaulting unit to floor', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '4000' }];
    const once = applyWorkbookPricesToProductRows(rows, ctx(4000, 4500));
    expect(once[0].unitPrice).toBe('4000');
    expect(once[0].recommendedPricePerMeter).toBe(4500);
    expect(applyWorkbookPricesToProductRows(once, ctx(4000, 4500))).toBe(once);
  });

  it('updates when the workbook floor differs', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '' }];
    const out = applyWorkbookPricesToProductRows(rows, ctx(4000, 4500));
    expect(out).not.toBe(rows);
    expect(out[0].unitPrice).toBe('4000');
  });

  it('does not overwrite a custom unit price above floor', () => {
    const rows = [
      {
        id: '1',
        name: 'Roofing Sheet',
        unitPrice: '5200',
        floorPricePerMeter: 4000,
        recommendedPricePerMeter: 4500,
      },
    ];
    const out = applyWorkbookPricesToProductRows(rows, ctx(4000, 4500));
    expect(out[0].unitPrice).toBe('5200');
  });
});
