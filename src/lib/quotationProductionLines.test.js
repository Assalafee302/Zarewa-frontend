import { describe, expect, it } from 'vitest';
import {
  quotationIsAccessoriesOnlyForProduction,
  quotedAccessoryLinesForProduction,
  quotationLinesGrouped,
} from './quotationProductionLines';

describe('quotationProductionLines', () => {
  it('treats quote as accessories-only when only accessory lines have qty', () => {
    const q = {
      materialTypeId: 'MAT-001',
      quotationLines: {
        products: [],
        accessories: [{ id: 'a1', name: 'Drive screw', qty: '50' }],
        services: [{ id: 's1', name: 'Delivery', qty: '1' }],
      },
    };
    expect(quotationIsAccessoriesOnlyForProduction(q)).toBe(true);
    expect(quotedAccessoryLinesForProduction(q)).toEqual([
      { quoteLineId: 'a1', name: 'Drive screw', ordered: 50 },
    ]);
  });

  it('groups lines_json when quotationLines missing arrays', () => {
    const q = {
      linesJson: JSON.stringify({
        materialTypeId: 'MAT-002',
        accessories: [{ name: 'Ridge cap', qty: '12' }],
      }),
    };
    const g = quotationLinesGrouped(q);
    expect(g.accessories).toHaveLength(1);
    expect(quotationIsAccessoriesOnlyForProduction(q)).toBe(true);
  });
});
