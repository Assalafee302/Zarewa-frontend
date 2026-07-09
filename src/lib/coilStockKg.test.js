import { describe, expect, it } from 'vitest';
import { coilKgUsed, coilOnHandKg } from './coilStockKg.js';

describe('coilStockKg', () => {
  it('does not show full GRN weight as on-hand when coil is consumed', () => {
    const lot = {
      weightKg: 3540,
      qtyReceived: 3540,
      qtyRemaining: 0,
      currentWeightKg: 0,
      currentStatus: 'Consumed',
    };
    expect(coilOnHandKg(lot)).toBe(0);
    expect(coilKgUsed(lot)).toBe(3540);
  });
});
