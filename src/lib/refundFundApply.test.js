import { describe, expect, it } from 'vitest';
import {
  applyRefundFundDeductionToPaymentLines,
  buildRefundFundClearanceSummary,
  isRefundFundApplyLedgerEntry,
  planCashierRefundOffset,
  refundFundAppliedByQuotationRef,
  refundFundAppliedOnQuotation,
  restorePaymentLinesAfterRefundFundUnchecked,
} from './refundFundApply.js';

describe('refund fund apply helpers', () => {
  it('recognises CREDIT_APPLY ledger rows and ignores same-quote OVERPAY_APPLY', () => {
    expect(
      isRefundFundApplyLedgerEntry({
        type: 'OVERPAY_APPLIED',
        bankReference: 'CREDIT_APPLY:RCA-1',
        amountNgn: 10_000,
      })
    ).toBe(true);
    expect(
      isRefundFundApplyLedgerEntry({
        type: 'OVERPAY_APPLIED',
        bankReference: 'OVERPAY_APPLY:QT-1:1',
        amountNgn: 10_000,
      })
    ).toBe(false);
    expect(
      isRefundFundApplyLedgerEntry({
        type: 'RECEIPT',
        bankReference: 'CREDIT_APPLY:RCA-1',
        amountNgn: 10_000,
      })
    ).toBe(false);
  });

  it('sums refund fund applied onto a quotation from ledger', () => {
    const ledgerEntries = [
      {
        type: 'OVERPAY_APPLIED',
        quotationRef: 'QT-NEW',
        bankReference: 'CREDIT_APPLY:RCA-1',
        amountNgn: 30_000,
        note: 'Credit confirmation: applied',
      },
      {
        type: 'OVERPAY_APPLIED',
        quotationRef: 'QT-NEW',
        bankReference: 'OVERPAY_APPLY:QT-NEW:9',
        amountNgn: 5_000,
      },
      {
        type: 'OVERPAY_APPLIED',
        quotationRef: 'QT-OTHER',
        bankReference: 'CREDIT_APPLY:RCA-2',
        amountNgn: 8_000,
      },
    ];
    const row = refundFundAppliedOnQuotation({ ledgerEntries, quotationRef: 'QT-NEW' });
    expect(row.appliedNgn).toBe(30_000);
    const byQuote = refundFundAppliedByQuotationRef({ ledgerEntries });
    expect(byQuote.get('QT-NEW')?.appliedNgn).toBe(30_000);
    expect(byQuote.get('QT-OTHER')?.appliedNgn).toBe(8_000);
  });

  it('prefers refund_credit_applications over ledger so amounts are not double-counted', () => {
    const applications = [
      {
        targetQuotationRef: 'QT-NEW',
        sourceQuotationRef: 'QT-OLD',
        refundId: 'RF-1',
        amountNgn: 25_000,
      },
    ];
    const ledgerEntries = [
      {
        type: 'OVERPAY_APPLIED',
        quotationRef: 'QT-NEW',
        bankReference: 'CREDIT_APPLY:RCA-1',
        amountNgn: 25_000,
      },
    ];
    const row = refundFundAppliedOnQuotation({
      applications,
      ledgerEntries,
      quotationRef: 'QT-NEW',
    });
    expect(row.appliedNgn).toBe(25_000);
    expect(row.detailLabel).toContain('RF-1');
  });

  it('auto-deducts cash lines to remaining due after refund fund', () => {
    expect(applyRefundFundDeductionToPaymentLines([{ id: 'a', amount: '' }], 40_000)).toEqual([
      { id: 'a', amount: '40000' },
    ]);
    expect(applyRefundFundDeductionToPaymentLines([{ id: 'a', amount: '80000' }], 40_000)).toEqual([
      { id: 'a', amount: '40000' },
    ]);
    expect(applyRefundFundDeductionToPaymentLines([{ id: 'a', amount: '80000' }], 0)).toEqual([
      { id: 'a', amount: '' },
    ]);
    expect(
      applyRefundFundDeductionToPaymentLines(
        [
          { id: 'a', amount: '10000' },
          { id: 'b', amount: '5000' },
        ],
        40_000
      )
    ).toEqual([
      { id: 'a', amount: '10000' },
      { id: 'b', amount: '5000' },
    ]);
    expect(
      applyRefundFundDeductionToPaymentLines(
        [
          { id: 'a', amount: '30000' },
          { id: 'b', amount: '20000' },
        ],
        40_000
      )
    ).toEqual([
      { id: 'a', amount: '30000' },
      { id: 'b', amount: '10000' },
    ]);
  });

  it('restores full due when refund fund is unchecked after auto-deduct', () => {
    expect(
      restorePaymentLinesAfterRefundFundUnchecked([{ id: 'a', amount: '40000' }], 80_000, 40_000)
    ).toEqual([{ id: 'a', amount: '80000' }]);
    expect(
      restorePaymentLinesAfterRefundFundUnchecked([{ id: 'a', amount: '15000' }], 80_000, 40_000)
    ).toEqual([{ id: 'a', amount: '15000' }]);
  });

  it('builds cashier clearance summary with deducted vs cash', () => {
    const summary = buildRefundFundClearanceSummary({
      ledgerEntries: [
        {
          type: 'OVERPAY_APPLIED',
          quotationRef: 'QT-NEW',
          bankReference: 'CREDIT_APPLY:RCA-1',
          amountNgn: 45_000,
        },
      ],
      quotationRef: 'QT-NEW',
      cashOnReceiptNgn: 35_000,
      quoteTotalNgn: 80_000,
    });
    expect(summary?.appliedNgn).toBe(45_000);
    expect(summary?.cashOnReceiptNgn).toBe(35_000);
    expect(summary?.quoteTotalNgn).toBe(80_000);
    expect(
      buildRefundFundClearanceSummary({
        ledgerEntries: [],
        quotationRef: 'QT-NEW',
        cashOnReceiptNgn: 35_000,
      })
    ).toBeNull();
  });

  it('plans cashier receipt offset against approved refund fund', () => {
    expect(planCashierRefundOffset({ receiptCashNgn: 80_000, availableNgn: 50_000 })).toEqual({
      offsetNgn: 50_000,
      cashToConfirmNgn: 30_000,
      leftoverRefundNgn: 0,
    });
    expect(planCashierRefundOffset({ receiptCashNgn: 40_000, availableNgn: 90_000 })).toEqual({
      offsetNgn: 40_000,
      cashToConfirmNgn: 0,
      leftoverRefundNgn: 50_000,
    });
  });
});
