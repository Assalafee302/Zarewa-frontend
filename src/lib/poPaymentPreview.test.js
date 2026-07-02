import { describe, expect, it } from 'vitest';
import { buildPoPaymentPreview, findAccountsPayableForPo } from './poPaymentPreview.js';

describe('findAccountsPayableForPo', () => {
  it('matches payable by poRef', () => {
    const ap = findAccountsPayableForPo('PO-1', [
      { apID: 'AP-1', poRef: 'PO-2' },
      { apID: 'AP-2', poRef: 'PO-1' },
    ]);
    expect(ap?.apID).toBe('AP-2');
  });
});

describe('buildPoPaymentPreview', () => {
  it('merges PO supplier and AP treasury payouts', () => {
    const out = buildPoPaymentPreview({
      po: { poID: 'PO-1' },
      accountsPayable: [{ apID: 'AP-9', poRef: 'PO-1', amountNgn: 100000, paidNgn: 50000 }],
      treasuryMovements: [
        {
          id: 't1',
          type: 'SUPPLIER_PAYMENT',
          sourceKind: 'PURCHASE_ORDER',
          sourceId: 'PO-1',
          amountNgn: -20000,
          postedAtISO: '2026-01-10',
          accountName: 'Main bank',
        },
        {
          id: 't2',
          type: 'AP_PAYMENT',
          sourceKind: 'ACCOUNTS_PAYABLE',
          sourceId: 'AP-9',
          amountNgn: -30000,
          postedAtISO: '2026-01-15',
          accountName: 'Main bank',
          reference: 'INV-1',
        },
        {
          id: 't3',
          type: 'TRANSPORT_PAYMENT',
          sourceKind: 'PURCHASE_ORDER',
          sourceId: 'PO-1',
          amountNgn: -5000,
          postedAtISO: '2026-01-12',
        },
      ],
    });

    expect(out.payable?.apID).toBe('AP-9');
    expect(out.supplierPayments).toHaveLength(2);
    expect(out.transportPayments).toHaveLength(1);
    expect(out.supplierPayments[0].postedAtISO).toBe('2026-01-15');
  });
});
