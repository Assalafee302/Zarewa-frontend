import { describe, expect, it } from 'vitest';
import {
  mergeOpenPayablesSources,
  payablesFromOutstandingPurchaseOrders,
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

  it('payablesFromOutstandingPurchaseOrders skips rejected POs', () => {
    expect(
      payablesFromOutstandingPurchaseOrders([
        { poID: 'PO-R', status: 'Rejected', outstandingNgn: 50 },
        { poID: 'PO-O', status: 'Approved', outstandingNgn: 50, amountNgn: 50 },
      ]).map((r) => r.poRef)
    ).toEqual(['PO-O']);
  });
});
