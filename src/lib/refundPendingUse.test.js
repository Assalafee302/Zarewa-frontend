import { describe, expect, it } from 'vitest';
import {
  hangingRefundHowToUse,
  ledgerOverpayHowToUse,
  receiptLineHangingRefundHint,
  unavailableRefundHowToUse,
} from './refundPendingUse.js';
import { normalizeRefund } from './refundsStore.js';

describe('refund pending use copy', () => {
  it('tells cashier how to use a false-settled overpayment', () => {
    const r = normalizeRefund({
      refundID: 'RF-KD-26-9553',
      status: 'Approved',
      reasonCategory: '["Overpayment"]',
      amountNgn: 61_200,
      approvedAmountNgn: 61_200,
      paidAmountNgn: 61_200,
      paidAtISO: '',
      paidBy: '',
      quotationRef: 'QT-KD-26-1342',
    });
    expect(hangingRefundHowToUse(r)).toMatch(/Tick this refund/i);
  });

  it('says how much was already used and what is left', () => {
    expect(
      hangingRefundHowToUse({
        refundID: 'RF-KD-26-9505',
        status: 'Approved',
        reasonCategory: '["Overpayment"]',
        amountNgn: 151_330,
        availableNgn: 128_300,
        creditAppliedNgn: 23_030,
        creditAppliedToQuotationRef: 'QT-KD-26-1282',
      })
    ).toMatch(/Already used ₦23,030 on QT-KD-26-1282/);
  });

  it('flags a receipt split that matches hanging refund amount', () => {
    const hanging = [
      normalizeRefund({
        refundID: 'RF-KD-26-9553',
        status: 'Pending',
        amountNgn: 61_200,
        quotationRef: 'QT-KD-26-1342',
      }),
    ];
    expect(receiptLineHangingRefundHint(61_200, hanging)).toMatch(/RF-KD-26-9553/);
    expect(receiptLineHangingRefundHint(34_000, hanging)).toBe('');
  });

  it('says overpay can cover a receipt without filing a refund', () => {
    expect(ledgerOverpayHowToUse()).toMatch(/no refund request needed/i);
  });

  it('tells cashier a till-paid overpayment cannot cover a new receipt', () => {
    expect(
      unavailableRefundHowToUse({
        refundId: 'RF-KD-26-9456',
        status: 'Approved',
        overpaymentOnly: true,
        paidAtISO: '2026-08-08',
        paidBy: 'Zarewa Admin',
        paidAmountNgn: 771_500,
        reason:
          'Already paid out on 2026-08-08 — cannot cover another receipt. Do not confirm the same ₦ as new bank cash.',
      })
    ).toMatch(/already paid out/i);
  });
});
