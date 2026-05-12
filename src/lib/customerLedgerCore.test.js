import { describe, expect, it } from 'vitest';
import {
  companionOverpayNgnByReceiptId,
  planReceiptWithQuotation,
  advanceBalanceFromEntries,
  overpayCreditBalanceFromEntries,
} from './customerLedgerCore.js';

describe('advance vs overpay credit', () => {
  it('does not treat OVERPAY_ADVANCE as deposit advance', () => {
    const entries = [
      { customerID: 'C1', type: 'ADVANCE_IN', amountNgn: 100_000 },
      { customerID: 'C1', type: 'OVERPAY_ADVANCE', amountNgn: 50_000 },
    ];
    expect(advanceBalanceFromEntries(entries, 'C1')).toBe(100_000);
    expect(overpayCreditBalanceFromEntries(entries, 'C1')).toBe(50_000);
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

  it('matches planReceiptWithQuotation two-row output', () => {
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
    expect(plan.rows).toHaveLength(2);
    const entries = plan.rows.map((row, i) => ({
      ...row,
      id: i === 0 ? 'LE-R' : 'LE-O',
      atISO: row.atISO || '2026-01-15T12:00:00.000Z',
    }));
    const m = companionOverpayNgnByReceiptId(entries);
    expect(m.get('LE-R')).toBe(3_500_000 - 3_332_840);
  });

  it('planReceiptWithQuotation fullAmountAsReceipt posts one RECEIPT for full cash', () => {
    const qt = { id: 'Q9', totalNgn: 3_336_000, paidNgn: 0 };
    const plan = planReceiptWithQuotation([], {
      customerID: 'C',
      customerName: 'Cust',
      quotationRow: qt,
      amountNgn: 5_000_000,
      paymentMethod: 'Transfer',
      bankReference: 'REFX',
      dateISO: '2026-01-15',
      fullAmountAsReceipt: true,
    });
    expect(plan.ok).toBe(true);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].type).toBe('RECEIPT');
    expect(plan.rows[0].amountNgn).toBe(5_000_000);
  });
});
