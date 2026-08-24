import { describe, it, expect } from 'vitest';
import {
  paymentCountByQuotationRef,
  quotationDisplayPaymentStatus,
  quotationListPaymentMeta,
  quotationsStillToBalanceRows,
  quotationBalanceTransactions,
  PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN,
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

  it('lists quotations that still have a partial balance', () => {
    const rows = quotationsStillToBalanceRows(
      [
        { id: 'QT-PAID', paidNgn: 100, totalNgn: 100 },
        { id: 'QT-OPEN', paidNgn: 40_000, totalNgn: 100_000, customer: 'Acme' },
        { id: 'QT-VOID', status: 'cancelled', paidNgn: 10, totalNgn: 100 },
        { id: 'QT-UNPAID', paidNgn: 0, totalNgn: 80_000 },
      ]
    );
    expect(rows.map((r) => r.id)).toEqual(['QT-OPEN']);
    expect(rows[0].balance).toBe(60_000);
  });

  it('hides leftover balances of ₦999 and below on the finance desk', () => {
    const rows = quotationsStillToBalanceRows(
      [
        { id: 'QT-CRUMB', paidNgn: 99_200, totalNgn: 100_000 },
        { id: 'QT-EDGE', paidNgn: 99_001, totalNgn: 100_000 },
        { id: 'QT-OVER', paidNgn: 99_000, totalNgn: 100_000 },
        { id: 'QT-MATERIAL', paidNgn: 40_000, totalNgn: 100_000 },
      ],
      { minBalanceNgn: PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN }
    );
    expect(rows.map((r) => r.id)).toEqual(['QT-MATERIAL', 'QT-OVER']);
    expect(rows.find((r) => r.id === 'QT-OVER').balance).toBe(1_000);
    expect(rows.every((r) => r.balance > PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN)).toBe(true);
  });

  it('lists receipts and quote money ledger for the balance popup', () => {
    const rows = quotationBalanceTransactions({
      quotationId: 'QT-OPEN',
      receipts: [
        { id: 'RC-1', quotationRef: 'QT-OPEN', dateISO: '2026-08-01', amountNgn: 40_000, method: 'Transfer' },
      ],
      ledgerEntries: [
        { id: 'LE-ADV', type: 'ADVANCE_APPLIED', quotationRef: 'QT-OPEN', atISO: '2026-08-02', amountNgn: 5_000, note: 'Advance' },
        { id: 'LE-SKIP', type: 'STOCK_ISSUE', quotationRef: 'QT-OPEN', amountNgn: 1 },
      ],
    });
    expect(rows.map((r) => r.id)).toEqual(['LE-ADV', 'RC-1']);
    expect(rows[1].kind).toBe('receipt');
    expect(rows[1].amountNgn).toBe(40_000);
  });

  it('distinguishes payment row vs quotation add-payment context', () => {
    expect(isExistingSalesPaymentRow({ source: 'ledger', id: 'LE-1' })).toBe(true);
    expect(isQuotationAddPaymentContext({ id: 'QT-99', totalNgn: 100 })).toBe(true);
    expect(isQuotationAddPaymentContext({ source: 'ledger', id: 'LE-1' })).toBe(false);
  });
});
