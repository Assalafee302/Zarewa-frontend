import { describe, it, expect } from 'vitest';
import {
  buildCoilPurchaseSuggestions,
  buildCoilStockOverview,
  buildSkuStockOverview,
  buildPendingProductionsOverview,
  freeCoilWeightKgForOverview,
  rollupSkuStockDisplayRows,
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

  it('subtracts reserved kg from a coil for free-kg purposes', () => {
    expect(freeCoilWeightKgForOverview({ currentWeightKg: 400, qtyReserved: 300 })).toBe(100);
    expect(freeCoilWeightKgForOverview({ currentWeightKg: 400, qtyReserved: 0 })).toBe(400);
    expect(freeCoilWeightKgForOverview({ currentWeightKg: 400, qtyReserved: 500 })).toBe(0);
  });

  it('does not suggest buying more of a fully-reserved coil bucket, but does suggest for a free one', () => {
    const coilLots = [
      // Fully reserved — gross looks fine (200kg) but nothing is actually free.
      { currentStatus: 'Reserved', materialTypeName: 'Aluminium', gaugeLabel: '0.45mm', colour: 'Red', currentWeightKg: 200, qtyReserved: 200, coilNo: 'CL-1' },
      // Free and low — should trigger a suggestion.
      { currentStatus: 'Available', materialTypeName: 'Aluminium', gaugeLabel: '0.5mm', colour: 'Blue', currentWeightKg: 50, qtyReserved: 0, coilNo: 'CL-2' },
    ];
    const coilStock = buildCoilStockOverview(coilLots);
    // Gross totals still show the reserved coil's material — it is physically on-hand.
    expect(coilStock.aluminium.totalKg).toBe(250);
    const suggestions = buildCoilPurchaseSuggestions({ coilStock, pendingProductions: [], coilLots });
    const reservedBucketSuggestion = suggestions.find((s) => s.gauge === '0.45mm');
    expect(reservedBucketSuggestion).toBeTruthy();
    expect(reservedBucketSuggestion.kgOnHand).toBe(0);
  });

  it('buckets galvanised, stone, and blank material types as unclassified instead of aluzinc', () => {
    const out = buildCoilStockOverview([
      { currentStatus: 'Active', materialTypeName: 'Aluzinc', gaugeLabel: '0.5', colour: 'Red', weightKg: 200 },
      { currentStatus: 'Active', materialTypeName: 'Galvanised', gaugeLabel: '0.5', colour: 'Grey', weightKg: 50 },
      { currentStatus: 'Active', materialTypeName: '', gaugeLabel: '0.5', colour: 'Grey', weightKg: 30 },
    ]);
    expect(out.aluzinc.totalKg).toBe(200);
    expect(out.unclassified.totalKg).toBe(80);
    expect(out.totalKg).toBe(280);
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

  it('rolls up branch-scoped accessory rows to one line per SKU', () => {
    const rows = rollupSkuStockDisplayRows(
      [
        { productID: 'ACC-RIVET-PACK', name: 'Rivet pins (pack)', stockLevel: 12, branchId: 'BR-KD' },
        { productID: 'ACC-RIVET-PACK', name: 'Rivet pins (pack)', stockLevel: 8, branchId: 'BR-YL' },
        { productID: 'ACC-RIVET-PACK', name: 'Rivet pins (pack)', stockLevel: 0, branchId: 'BR-MDG' },
      ],
      (p) => /^ACC-/i.test(String(p.productID || ''))
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].stockLevel).toBe(20);
  });

  it('sorts SKU display highest stock first and zero stock last', () => {
    const rows = rollupSkuStockDisplayRows(
      [
        { productID: 'ACC-A', name: 'Zero', stockLevel: 0 },
        { productID: 'ACC-B', name: 'High', stockLevel: 50 },
        { productID: 'ACC-C', name: 'Low', stockLevel: 5 },
      ],
      (p) => /^ACC-/i.test(String(p.productID || ''))
    );
    expect(rows.map((r) => r.productID)).toEqual(['ACC-B', 'ACC-C', 'ACC-A']);
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
