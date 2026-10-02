import { describe, expect, it } from 'vitest';
import { parseNairaInput, previewExtraPayment, previewPaymentCorrection } from './supplierOverpaymentDesk.js';

describe('supplier overpayment desk', () => {
  it('parses naira typed with commas', () => {
    expect(parseNairaInput('1,200,000')).toBe(1_200_000);
    expect(parseNairaInput('₦800,000')).toBe(800_000);
  });

  it('splits an extra transfer between the invoice and the advance', () => {
    expect(previewExtraPayment({ stillOwedNgn: 1_000_000, amountNgn: 1_200_000 })).toEqual({
      amountNgn: 1_200_000,
      settlementNgn: 1_000_000,
      advanceNgn: 200_000,
      withinInvoice: false,
    });
    expect(previewExtraPayment({ stillOwedNgn: 400_000, amountNgn: 400_000 }).withinInvoice).toBe(true);
  });

  it('shows the order position after a wrong payment is corrected', () => {
    const up = previewPaymentCorrection({
      obligationNgn: 1_000_000,
      supplierPaidNgn: 1_000_000,
      currentLineNgn: 1_000_000,
      nextLineNgn: 1_200_000,
    });
    expect(up.nextPaidNgn).toBe(1_200_000);
    expect(up.excessNgn).toBe(200_000);
    expect(up.stillOwedNgn).toBe(0);

    const down = previewPaymentCorrection({
      obligationNgn: 1_000_000,
      supplierPaidNgn: 1_000_000,
      currentLineNgn: 1_000_000,
      nextLineNgn: 800_000,
    });
    expect(down.nextPaidNgn).toBe(800_000);
    expect(down.stillOwedNgn).toBe(200_000);
    expect(down.excessNgn).toBe(0);
  });
});
