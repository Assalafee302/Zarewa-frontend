import { describe, it, expect } from 'vitest';
import {
  buildCoilStockOverview,
  buildSkuStockOverview,
  buildPendingProductionsOverview,
} from './operationsProductionOverviewCore';

describe('operationsProductionOverviewCore', () => {
  it('splits coil stock by aluminium and aluzinc', () => {
    const out = buildCoilStockOverview([
      { currentStatus: 'Active', materialTypeName: 'Aluminium', gaugeLabel: '0.5', colour: 'Red', weightKg: 200 },
      { currentStatus: 'Active', materialTypeName: 'Aluzinc', gaugeLabel: '0.5', colour: 'Blue', weightKg: 300 },
    ]);
    expect(out.aluminium.totalKg).toBe(200);
    expect(out.aluzinc.totalKg).toBe(300);
  });

  it('merges IV and Ivory Beige into one stock bucket when master data is present', () => {
    const masterData = { colours: [{ name: 'Ivory Beige', abbreviation: 'IV', active: true }] };
    const out = buildCoilStockOverview(
      [
        { currentStatus: 'Active', materialTypeName: 'Aluzinc', gaugeLabel: '0.24mm', colour: 'IV', weightKg: 100 },
        {
          currentStatus: 'Active',
          materialTypeName: 'Aluzinc',
          gaugeLabel: '0.24mm',
          colour: 'Ivory Beige',
          weightKg: 200,
        },
      ],
      masterData
    );
    expect(out.aluzinc.top).toHaveLength(1);
    expect(out.aluzinc.top[0].colour).toBe('Ivory Beige');
    expect(out.aluzinc.top[0].kg).toBe(300);
  });

  it('lists stone SKUs', () => {
    const out = buildSkuStockOverview(
      [{ productID: 'STONE-1', name: 'Stone sheet', stockLevel: 10, lowStockThreshold: 20, unit: 'm' }],
      'stone'
    );
    expect(out.totalSkus).toBe(1);
    expect(out.lowCount).toBe(1);
  });

  it('finds unregistered cutting lists as pending', () => {
    const pending = buildPendingProductionsOverview({
      cuttingLists: [{ id: 'CL-1', productionRegistered: false, customer: 'Acme', quotationRef: 'Q1' }],
      productionQueueModel: { sections: [] },
      hasWorkspaceData: true,
    });
    expect(pending.some((p) => p.id === 'CL-1')).toBe(true);
  });
});
