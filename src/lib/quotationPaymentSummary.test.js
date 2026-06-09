import { describe, it, expect } from 'vitest';
import {
  paymentCountByQuotationRef,
  quotationDisplayPaymentStatus,
  quotationListPaymentMeta,
  isExistingSalesPaymentRow,
  isQuotationAddPaymentContext,
} from './quotationPaymentSummary.js';

describe('quotationPaymentSummary', () => {
  it('counts payments per quotation ref', () => {
    const map = paymentCountByQuotationRef([
      { quotationRef: 'QT-1' },
      { quotationRef: 'QT-1' },
      { quotationRef: 'QT-2' },
    ]);
    expect(map.get('QT-1')).toBe(2);
    expect(map.get('QT-2')).toBe(1);
  });

  it('formats list meta with payment count', () => {
    const meta = quotationListPaymentMeta(
      { date: '2026-05-01', paidNgn: 150000, totalNgn: 650000 },
      3
    );
    expect(meta).toContain('3 payments');
    expect(meta).toContain('Paid');
  });

  it('derives Paid when paidNgn meets total despite stale Unpaid status', () => {
    expect(
      quotationDisplayPaymentStatus({
        id: 'QT-1',
        paymentStatus: 'Unpaid',
        paidNgn: 1_000_000,
        totalNgn: 1_000_000,
      })
    ).toBe('Paid');
  });

  it('uses receipt mirrors when quotation paidNgn lags', () => {
    expect(
      quotationDisplayPaymentStatus(
        { id: 'QT-2', paymentStatus: 'Unpaid', paidNgn: 0, totalNgn: 500_000 },
        {
          salesReceipts: [{ quotationRef: 'QT-2', amountNgn: 500_000 }],
          ledgerEntries: [],
        }
      )
    ).toBe('Paid');
  });

  it('distinguishes payment row vs quotation add-payment context', () => {
    expect(isExistingSalesPaymentRow({ source: 'ledger', id: 'LE-1' })).toBe(true);
    expect(isQuotationAddPaymentContext({ id: 'QT-99', totalNgn: 100 })).toBe(true);
    expect(isQuotationAddPaymentContext({ source: 'ledger', id: 'LE-1' })).toBe(false);
  });
});
