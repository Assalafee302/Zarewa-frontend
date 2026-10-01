import { describe, expect, it } from 'vitest';
import {
  mergeOpenPayablesSources,
  mergeSettledPayablesSources,
  payablesFromOutstandingPurchaseOrders,
  payableOutstandingNgn,
} from './procurementPayablesSorting';

describe('mergeOpenPayablesSources', () => {
  it('fills open payables from unpaid POs when the AP register is empty', () => {
    const rows = mergeOpenPayablesSources({
      accountsPayable: [],
      purchaseOrders: [
        {
          poID: 'PO-1',
          supplierName: 'Coil House',
          amountNgn: 100000,
          paidNgn: 0,
          outstandingNgn: 100000,
          status: 'Approved',
          orderDateISO: '2026-07-01',
        },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ apID: 'AP-PO-PO-1', poRef: 'PO-1', outstandingNgn: 100000 }),
    ]);
  });

  it('does not duplicate a PO that already has an AP row', () => {
    const rows = mergeOpenPayablesSources({
      accountsPayable: [{ apID: 'AP-1', poRef: 'PO-1', amountNgn: 100000, paidNgn: 10000 }],
      purchaseOrders: [{ poID: 'PO-1', outstandingNgn: 90000, amountNgn: 100000, paidNgn: 10000 }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].apID).toBe('AP-1');
  });

  it('payableOutstandingNgn prefers the snapshot outstanding field', () => {
    expect(payableOutstandingNgn({ amountNgn: 0, paidNgn: 0, outstandingNgn: 75_000 })).toBe(75_000);
    expect(payableOutstandingNgn({ amountNgn: 100_000, paidNgn: 40_000 })).toBe(60_000);
  });

  it('lists fully paid orders that the open payables merge drops', () => {
    const rows = mergeSettledPayablesSources({
      accountsPayable: [{ apID: 'AP-PAID', poRef: 'PO-2', amountNgn: 80000, paidNgn: 80000, outstandingNgn: 0 }],
      purchaseOrders: [
        { poID: 'PO-1', supplierName: 'Coil House', amountNgn: 100000, paidNgn: 0, outstandingNgn: 100000, status: 'Approved' },
        { poID: 'PO-2', supplierName: 'Coil House', amountNgn: 80000, paidNgn: 80000, outstandingNgn: 0, status: 'Approved' },
        { poID: 'PO-3', supplierName: 'Stone Yard', amountNgn: 40000, supplierPaidNgn: 40000, outstandingNgn: 0, status: 'Received' },
      ],
    });
    expect(rows.map((r) => r.poRef)).toEqual(['PO-2', 'PO-3']);
    expect(rows.every((r) => r.outstandingNgn === 0)).toBe(true);
  });

  it('payablesFromOutstandingPurchaseOrders skips rejected POs', () => {
    expect(
      payablesFromOutstandingPurchaseOrders([
        { poID: 'PO-R', status: 'Rejected', outstandingNgn: 50 },
        { poID: 'PO-O', status: 'Approved', outstandingNgn: 50, amountNgn: 50 },
      ]).map((r) => r.poRef)
    ).toEqual(['PO-O']);
  });
});
