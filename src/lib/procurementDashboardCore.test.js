import { describe, expect, it } from 'vitest';
import { buildProcurementDashboardModel, normalizePoStatus } from './procurementDashboardCore';

describe('normalizePoStatus', () => {
  it('maps mixed status labels into canonical flow', () => {
    expect(normalizePoStatus('Pending Approval')).toBe('requested');
    expect(normalizePoStatus('On loading')).toBe('dispatched');
    expect(normalizePoStatus('Received')).toBe('received');
    expect(normalizePoStatus('Rejected')).toBe('rejected');
  });
});

describe('buildProcurementDashboardModel', () => {
  it('computes core KPI totals and aging buckets', () => {
    const model = buildProcurementDashboardModel({
      purchaseOrders: [
        {
          orderDateISO: '2026-05-01',
          status: 'Approved',
          supplierID: 'SUP-1',
          supplierPaidNgn: 100,
          lines: [{ qtyOrdered: 10, unitPriceNgn: 50 }],
        },
      ],
      suppliers: [{ supplierID: 'SUP-1', name: 'Alpha' }],
      accountsPayable: [{ amountNgn: 1000, paidNgn: 0, dueDateISO: '2026-04-01' }],
      products: [{ stockLevel: 0, unitCost: 10 }],
      inTransitLoads: [{ status: 'in_transit' }],
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(model.kpis.totalPurchasesMonthNgn).toBe(500);
    expect(model.kpis.outstandingSupplierPaymentsNgn).toBe(400);
    expect(model.kpis.activeSuppliers).toBe(1);
    expect(model.kpis.stockOutIncidents).toBe(1);
    expect(model.kpis.goodsInTransitCount).toBe(1);
    expect(model.charts.poStatusFlow.find((x) => x.key === 'approved')?.count).toBe(1);
    expect(model.charts.payablesAging.over_90 >= 0).toBe(true);
  });
});

