import { describe, expect, it } from 'vitest';
import {
  companionOverpayNgnByReceiptId,
  planReceiptWithQuotation,
  advanceBalanceFromEntries,
  overpayCreditBalanceFromEntries,
  overpayCreditRemainingOnQuotationFromEntries,
  pendingAdvanceDepositRowsFromEntries,
  advanceInRemainingNgnByIdFromEntries,
} from './customerLedgerCore.js';

describe('pending advance deposits', () => {
  it('hides fully applied ADVANCE_IN and shows partial remaining', () => {
    const entries = [
      { id: 'A1', customerID: 'C1', type: 'ADVANCE_IN', amountNgn: 100_000, atISO: '2026-01-01T12:00:00.000Z' },
      { id: 'AP1', customerID: 'C1', type: 'ADVANCE_APPLIED', amountNgn: 60_000, quotationRef: 'Q1' },
    ];
    expect(advanceInRemainingNgnByIdFromEntries(entries).get('A1')).toBe(40_000);
    const pending = pendingAdvanceDepositRowsFromEntries(entries);
    expect(pending).toHaveLength(1);
    expect(pending[0].amountNgn).toBe(40_000);
  });
});

describe('advance vs overpay credit', () => {
  it('does not treat OVERPAY_ADVANCE as deposit advance', () => {
    const entries = [
      { customerID: 'C1', type: 'ADVANCE_IN', amountNgn: 100_000 },
      { customerID: 'C1', type: 'OVERPAY_ADVANCE', amountNgn: 50_000 },
    ];
    expect(advanceBalanceFromEntries(entries, 'C1')).toBe(100_000);
    expect(overpayCreditBalanceFromEntries(entries, 'C1')).toBe(50_000);
  });

  it('overpayCreditRemainingOnQuotationFromEntries ignores other quotations', () => {
    const entries = [
      { customerID: 'C1', quotationRef: 'Q1', type: 'OVERPAY_ADVANCE', amountNgn: 10_000 },
      { customerID: 'C1', quotationRef: 'Q2', type: 'OVERPAY_ADVANCE', amountNgn: 99_000 },
      { customerID: 'C1', quotationRef: 'Q1', type: 'OVERPAY_REVERSAL', amountNgn: 3_000 },
    ];
    expect(overpayCreditRemainingOnQuotationFromEntries(entries, 'C1', 'Q1')).toBe(7_000);
    expect(overpayCreditRemainingOnQuotationFromEntries(entries, 'C1', 'Q2')).toBe(99_000);
  });
});

describe('companionOverpayNgnByReceiptId', () => {
  it('pairs split receipt + overpay from one payment', () => {
    const entries = [
      {
        id: 'R1',
        type: 'RECEIPT',
        customerID: 'C1',
        quotationRef: 'Q1',
        atISO: '2026-04-04T12:00:00.000Z',
        paymentMethod: 'Transfer',
        bankReference: 'REF1',
        amountNgn: 3_332_840,
        note: 'Settlement to quotation balance (receipt)',
      },
      {
        id: 'O1',
        type: 'OVERPAY_ADVANCE',
        customerID: 'C1',
        quotationRef: 'Q1',
        atISO: '2026-04-04T12:00:00.000Z',
        paymentMethod: 'Transfer',
        bankReference: 'REF1',
        amountNgn: 167_160,
        note: 'Overpayment vs remaining balance on Q1 → advance',
      },
    ];
    const m = companionOverpayNgnByReceiptId(entries);
    expect(m.get('R1')).toBe(167_160);
  });

  it('planReceiptWithQuotation always posts one RECEIPT for full cash (no split at post)', () => {
    const qt = { id: 'Q9', totalNgn: 3_332_840, paidNgn: 0 };
    const plan = planReceiptWithQuotation([], {
      customerID: 'C',
      customerName: 'Cust',
      quotationRow: qt,
      amountNgn: 3_500_000,
      paymentMethod: 'Cash',
      bankReference: '',
      dateISO: '2026-01-15',
    });
    expect(plan.ok).toBe(true);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].type).toBe('RECEIPT');
    expect(plan.rows[0].amountNgn).toBe(3_500_000);
  });
});
