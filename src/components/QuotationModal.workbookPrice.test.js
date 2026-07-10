import { describe, it, expect } from 'vitest';

/**
 * Mirrors QuotationModal refreshWorkbookProductPrices change detection:
 * rewriting productRows with identical prices must not count as a change
 * (that loop was React #185 when selecting a product).
 */
function applyWorkbookPrices(prev, resolvePrice) {
  let anyChange = false;
  const next = prev.map((row) => {
    const name = String(row.name ?? '').trim();
    if (!name) return row;
    const price = resolvePrice(name);
    if (!(price > 0)) return row;
    const nextUnit = String(price);
    if (String(row.unitPrice ?? '') === nextUnit) return row;
    anyChange = true;
    return { ...row, unitPrice: nextUnit };
  });
  return anyChange ? next : prev;
}

describe('quotation workbook price refresh', () => {
  it('returns the same array reference when prices are already applied', () => {
    const rows = [{ id: '1', name: 'Aluzinc Sheet', unitPrice: '4500' }];
    const out = applyWorkbookPrices(rows, () => 4500);
    expect(out).toBe(rows);
  });

  it('updates when the workbook price differs', () => {
    const rows = [{ id: '1', name: 'Aluzinc Sheet', unitPrice: '' }];
    const out = applyWorkbookPrices(rows, () => 4500);
    expect(out).not.toBe(rows);
    expect(out[0].unitPrice).toBe('4500');
  });
});
