import { describe, expect, it } from 'vitest';
import { buildSalesDashboardModel, normalizeSalesPipelineStatus } from './salesDashboardCore';

describe('normalizeSalesPipelineStatus', () => {
  it('maps statuses into canonical stages', () => {
    expect(normalizeSalesPipelineStatus('Pending')).toBe('requested');
    expect(normalizeSalesPipelineStatus('Approved')).toBe('approved');
    expect(normalizeSalesPipelineStatus('Paid')).toBe('paid');
    expect(normalizeSalesPipelineStatus('Closed')).toBe('delivered');
    expect(normalizeSalesPipelineStatus('Void')).toBe('cancelled');
  });
});

describe('buildSalesDashboardModel', () => {
  it('computes basic sales KPIs and charts', () => {
    const model = buildSalesDashboardModel({
      quotations: [
        { id: 'Q1', dateISO: '2026-05-01', totalNgn: 1000, paidNgn: 400, status: 'Approved', paymentStatus: 'Partial', customerID: 'C1' },
      ],
      receipts: [{ id: 'R1', dateISO: '2026-05-02', amountNgn: 400 }],
      refunds: [{ status: 'Approved', amountNgn: 100, paidAmountNgn: 0 }],
      cuttingLists: [{ id: 'CL1', productionRegistered: false }],
      productionJobs: [{ actualMeters: 120, revenueNgn: 800, materialType: 'Longspan' }],
      customers: [{ customerID: 'C1', name: 'Test Customer' }],
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(model.kpis.salesMtdNgn).toBe(1000);
    expect(model.kpis.outstandingReceivablesNgn).toBe(600);
    expect(model.charts.topCustomers[0]?.name).toBe('Test Customer');
    expect(model.charts.pipeline.some((x) => x.stage === 'approved')).toBe(true);
    expect(model.alerts.length > 0).toBe(true);
  });
});

