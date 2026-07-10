import { describe, it, expect } from 'vitest';
import { applyWorkbookPricesToProductRows } from '../lib/quotationWorkbookPriceApply.js';

/**
 * QuotationModal refreshWorkbookProductPrices must not rewrite productRows
 * when prices are unchanged (that loop was React #185 on product select).
 */
describe('quotation workbook price refresh', () => {
  const ctx = (price) => ({
    options: [{ name: 'Roofing Sheet' }],
    resolveUnitPrice: () => price,
    resolveWorkbookLineMeta: () => null,
  });

  it('returns the same array reference when prices are already applied', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '4500' }];
    const out = applyWorkbookPricesToProductRows(rows, ctx(4500));
    expect(out).toBe(rows);
  });

  it('updates when the workbook price differs', () => {
    const rows = [{ id: '1', name: 'Roofing Sheet', unitPrice: '' }];
    const out = applyWorkbookPricesToProductRows(rows, ctx(4500));
    expect(out).not.toBe(rows);
    expect(out[0].unitPrice).toBe('4500');
  });
});
