import { describe, expect, it } from 'vitest';
import { countLowStockFromSnapshot } from './lowStockFromSnapshot.js';

describe('countLowStockFromSnapshot', () => {
  it('counts SKUs below threshold from snapshot.products', () => {
    const { count, examples } = countLowStockFromSnapshot({
      products: [
        { productID: 'A', name: 'Alpha sheet', stockLevel: 50, lowStockThreshold: 100 },
        { productID: 'B', name: 'Beta coil', stockLevel: 200, lowStockThreshold: 100 },
      ],
    });
    expect(count).toBe(1);
    expect(examples).toEqual(['Alpha sheet']);
  });
});
