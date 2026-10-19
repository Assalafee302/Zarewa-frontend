import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { hangingRefundAttention, receiptAttention, receiptAttentionLink } from './cashierAttention.js';

describe('cashier desk sentences', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T09:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const receipt = { id: 'RC-KD-26-0101', amountNgn: 57_750, customer: 'Ibrahim Sani', dateISO: '2026-10-08', status: 'No bank receipt' };

  it('awaiting credit check', () => {
    expect(receiptAttention(receipt, 'receipt_no_bank_line').sentence).toBe(
      'Receipt ₦57,750 from Ibrahim Sani has no matching bank line after 11 days'
    );
    expect(receiptAttentionLink(receipt, 'receipt_no_bank_line')).toBe(
      '/cashier?receipt=RC-KD-26-0101&attention=receipt_no_bank_line%3ARC-KD-26-0101'
    );
  });

  it('under investigation', () => {
    const r = { ...receipt, status: 'Suspended — under investigation', investigationCaseId: 'INV-3', dateISO: '2026-10-15' };
    expect(receiptAttention(r, 'receipt_under_investigation').sentence).toBe(
      'Receipt ₦57,750 from Ibrahim Sani is under investigation (case INV-3) — it cannot be confirmed until the case is cleared — 4 days'
    );
  });

  it('hanging refund chip', () => {
    const indicator = {
      count: 1,
      totalOpenNgn: 15_350,
      overpayCreditNgn: 0,
      refunds: [{ refundID: 'RF-KD-26-9500', status: 'Approved', approvalDate: '2026-10-16', amountNgn: 15_350 }],
    };
    expect(hangingRefundAttention(indicator, 'Tahir Musa', () => 15_350).sentence).toBe(
      'Tahir Musa has refund RF-KD-26-9500 ₦15,350 approved 16 Oct and unpaid — check this receipt is not the same money'
    );
    expect(
      hangingRefundAttention({ count: 0, overpayCreditNgn: 4_000, refunds: [] }, 'Ade', () => 0).sentence
    ).toBe("Overpayment credit ₦4,000 is on the customer's ledger — not applied to a quote or refunded");
    expect(hangingRefundAttention(null, 'x', () => 0)).toBeNull();
  });
});
