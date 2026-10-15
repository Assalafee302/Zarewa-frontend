import { describe, expect, it } from 'vitest';
import { coilInventoryValuationRows } from './liveAnalytics.js';
import { monthEndStockFromMaterialReport, monthEndStockSheetAoa, monthEndStockSheetRows } from './monthEndStockExport.js';

const closing = {
  asAtISO: '2026-08-31',
  rows: [
    { coilNo: 'CL-1', family: 'aluzinc', gaugeLabel: '0.40mm', colour: 'Blue', kgGross: 2000, spoolKg: 65, kgNet: 1935, unitCostNgnPerKg: 1738, boughtBy: 'kg', costSource: 'coil' },
    { coilNo: 'CL-2', family: 'aluminium', gaugeLabel: '0.55mm', colour: 'Mill', kgGross: 900, spoolKg: 0, kgNet: 900, unitCostNgnPerKg: 7022.5, boughtBy: 'metre', costSource: 'PO line amount ÷ kg received (bought by metre)' },
    { coilNo: 'CL-3', family: 'aluzinc', gaugeLabel: '0.40mm', colour: 'Red', kgGross: 40, spoolKg: 40, kgNet: 0, unitCostNgnPerKg: 1738, boughtBy: 'kg', costSource: 'coil' },
  ],
};

describe('month-end coil stock export', () => {
  const rep = monthEndStockFromMaterialReport({ coilRegister: { stock: { closing } } });

  it('builds from the material register closing stock and values at net', () => {
    expect(rep.asAtISO).toBe('2026-08-31');
    expect(rep.grandTotal).toMatchObject({ coilCount: 3, grossKg: 2940, spoolKg: 105, netKg: 2835 });
    expect(rep.grandTotal.valueNgn).toBe(Math.round(1935 * 1738) + Math.round(900 * 7022.5));
  });

  it('sheet: title, as-at, the one-line note, then Gross | Spool | Net | Rate | Value columns and totals', () => {
    const aoa = monthEndStockSheetAoa(rep, { branchLabel: 'Kaduna' });
    expect(aoa[0]).toEqual(['Month-end coil stock']);
    expect(aoa[1][0]).toBe('As at 2026-08-31 · Kaduna');
    expect(aoa[2]).toEqual(['Gross = weighed coil incl. spool; Net = gross − spool; value at net.']);
    expect(aoa[4]).toEqual(expect.arrayContaining(['Gross kg', 'Spool kg', 'Net kg', 'Rate ₦/kg', 'Value ₦']));
    const rows = monthEndStockSheetRows(rep);
    expect(rows.at(-1)).toMatchObject({ Line: 'Grand total', 'Gross kg': 2940, 'Spool kg': 105, 'Net kg': 2835 });
    expect(rows.filter((r) => r.Line === 'Subtotal')).toHaveLength(2);
    expect(rows.filter((r) => r.Line === 'Material total')).toHaveLength(2);
  });

  it('no stock block → null', () => {
    expect(monthEndStockFromMaterialReport({})).toBeNull();
  });
});

describe('coil inventory valuation — net kg × rate by the spool rule', () => {
  const lots = [
    { coilNo: 'Z1', materialTypeName: 'Aluzinc', productID: 'PRD-102', currentWeightKg: 1000, unitCostNgnPerKg: 2000, receivedAtISO: '2026-08-01' },
    { coilNo: 'Z2', materialTypeName: 'Aluzinc', productID: 'PRD-102', currentWeightKg: 50, unitCostNgnPerKg: 2000, receivedAtISO: '2026-08-01' },
    { coilNo: 'Z3', materialTypeName: 'Aluzinc', productID: 'PRD-102', currentWeightKg: 500, unitCostNgnPerKg: 2000 },
  ];
  const rows = coilInventoryValuationRows(lots, []);
  const by = Object.fromEntries(rows.map((r) => [r.coilNo, r]));

  it('Aluzinc deducts 65 kg and values the net', () => {
    expect(by.Z1).toMatchObject({ kgOnHand: 1000, spoolKg: 65, netKg: 935, extendedValueNgn: 1_870_000 });
  });
  it('a coil lighter than its spool is nil, never negative', () => {
    expect(by.Z2).toMatchObject({ kgOnHand: 50, spoolKg: 50, netKg: 0, extendedValueNgn: 0 });
  });
  it('a coil with no receive date uses the same rule at its own cost', () => {
    expect(by.Z3).toMatchObject({ spoolKg: 65, netKg: 435, extendedValueNgn: 870_000 });
  });
});
