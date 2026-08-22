import { describe, expect, it } from 'vitest';
import { quotationOrderFullySettledForRefundPicker } from './refundEligibility.js';

describe('refundEligibility', () => {
  it('quotationOrderFullySettledForRefundPicker uses ₦1 full-paid tolerance', () => {
    expect(quotationOrderFullySettledForRefundPicker(999_999, 1_000_000)).toBe(true);
    expect(quotationOrderFullySettledForRefundPicker(999_998, 1_000_000)).toBe(false);
    expect(quotationOrderFullySettledForRefundPicker(1_000_000, 1_000_000)).toBe(true);
    expect(quotationOrderFullySettledForRefundPicker(50_000, 0)).toBe(true);
  });
});
