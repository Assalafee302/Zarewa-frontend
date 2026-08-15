import { describe, expect, it } from 'vitest';
import {
  refundAmountExceedsEconomicFloorCap,
  refundFloorGatedAmountNgn,
} from './refundConstants.js';

describe('economic floor mixed Full refund', () => {
  it('does not block when overpayment sits above the production floor cap', () => {
    const mixed = [
      { category: 'Unproduced meterage', amountNgn: 113_640 },
      { category: 'Overpayment', amountNgn: 2_320 },
    ];
    expect(refundFloorGatedAmountNgn(mixed)).toBe(113_640);
    expect(
      refundAmountExceedsEconomicFloorCap({
        amountNgn: 115_960,
        calculationLines: mixed,
        categories: ['Unproduced meterage', 'Overpayment'],
        maxDefensibleRefundNgn: 113_640,
      })
    ).toBe(false);
  });

  it('still blocks when production-related lines alone exceed the cap', () => {
    expect(
      refundAmountExceedsEconomicFloorCap({
        amountNgn: 115_960,
        calculationLines: [{ category: 'Other', amountNgn: 115_960 }],
        categories: ['Other'],
        maxDefensibleRefundNgn: 113_640,
      })
    ).toBe(true);
  });
});
