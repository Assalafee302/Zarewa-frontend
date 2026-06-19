import { describe, expect, it } from 'vitest';
import { quotationOrderFullySettledForRefundPicker } from './refundEligibility.js';

describe('refundEligibility', () => {
  it('quotationOrderFullySettledForRefundPicker uses 99.5% full-paid tolerance', () => {
    expect(quotationOrderFullySettledForRefundPicker(995_000, 1_000_000)).toBe(true);
    expect(quotationOrderFullySettledForRefundPicker(994_999, 1_000_000)).toBe(false);
    expect(quotationOrderFullySettledForRefundPicker(1_000_000, 1_000_000)).toBe(true);
    expect(quotationOrderFullySettledForRefundPicker(50_000, 0)).toBe(true);
  });
});
