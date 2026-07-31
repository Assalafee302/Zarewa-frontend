import { describe, it, expect } from 'vitest';
import {
  normalizeOrgStoreRestock,
  mergeOrgStoreRestockBlob,
  resolveCoilRestockMinKg,
  normalizeSpecMinOverrides,
  DEFAULT_COIL_RESTOCK_MIN_KG,
} from './orgStoreRestock.js';

describe('orgStoreRestock', () => {
  it('defaults coil/stone mins and empty overrides', () => {
    expect(normalizeOrgStoreRestock(null)).toEqual({
      coilRestockMinKg: DEFAULT_COIL_RESTOCK_MIN_KG,
      stoneRestockMinM: 400,
      specMinOverrides: [],
    });
  });

  it('normalizes per-spec overrides and dedupes by key', () => {
    const list = normalizeSpecMinOverrides([
      { family: 'Aluzinc', colour: 'Gray Beige', gauge: '0.28mm', minKg: 900 },
      { family: 'aluzinc', colour: 'Gray Beige', gauge: '0.28', minKg: 1000 },
      { colour: '', gauge: '0.40', minKg: 500 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].minKg).toBe(1000);
    expect(list[0].key).toBe('aluzinc|Gray Beige|0.28');
  });

  it('resolveCoilRestockMinKg prefers matching override', () => {
    const overrides = normalizeSpecMinOverrides([
      { family: 'aluminium', colour: 'Ivory', gauge: '0.24', minKg: 500 },
    ]);
    expect(
      resolveCoilRestockMinKg(700, overrides, { family: 'aluminium', colour: 'Ivory', gauge: '0.24' })
    ).toBe(500);
    expect(
      resolveCoilRestockMinKg(700, overrides, { family: 'aluzinc', colour: 'Ivory', gauge: '0.24' })
    ).toBe(700);
  });

  it('mergeOrgStoreRestockBlob replaces override list when provided', () => {
    const prev = {
      coilRestockMinKg: 700,
      stoneRestockMinM: 400,
      specMinOverrides: [{ family: 'aluzinc', colour: 'A', gauge: '0.28', minKg: 800 }],
    };
    const next = mergeOrgStoreRestockBlob(prev, {
      coilRestockMinKg: 750,
      specMinOverrides: [{ family: 'aluzinc', colour: 'B', gauge: '0.40', minKg: 600 }],
    });
    expect(next.coilRestockMinKg).toBe(750);
    expect(next.specMinOverrides).toHaveLength(1);
    expect(next.specMinOverrides[0].colour).toBe('B');
  });
});
