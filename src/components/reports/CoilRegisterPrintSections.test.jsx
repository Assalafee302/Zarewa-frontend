import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoilRegisterPrintSections } from './CoilRegisterPrintSections';
import { coilRegisterExcelSheets } from '../../lib/coilRegisterExcel';

const totals = (n, kg, value) => ({ coilCount: n, kgGross: kg, spoolKg: 65 * n, kgNet: kg - 65 * n, valueGrossNgn: value, spoolValueNgn: 0, valueNetNgn: value });
const stock = (asAtISO, extra = {}) => ({
  asAtISO,
  withReceivedDateCorrections: false,
  rows: [
    { coilNo: 'CL-26-2096', family: 'aluzinc', gaugeLabel: '0.20mm', colour: 'Ivory Beige', kgGross: 2782, spoolKg: 65, kgNet: 2717, unitCostNgnPerKg: 1720, costSource: 'coil', valueGrossNgn: 4785040, spoolValueNgn: 111800, valueNetNgn: 4673240, receivedDateNote: 'Delivered 12 Sep' },
  ],
  totals: totals(1, 2782, 4785040),
  byFamily: { aluminium: totals(0, 0, 0), aluzinc: totals(1, 2782, 4785040) },
  ...extra,
});
const coilRegister = {
  stockCheckCorrectionsFromISO: '2026-10-01',
  stock: { opening: stock('2026-08-31'), closing: stock('2026-09-30'), openingWithCorrections: null, closingWithCorrections: stock('2026-09-30', { withReceivedDateCorrections: true }) },
  purchaseOrders: [
    { poID: 'PO-KD-26-0078', supplierName: 'Jack', orderDateISO: '2026-09-11', grnInPeriodValueNgn: 10603800, lines: [{ gauge: '0.24mm', colour: 'Bush Green', kgOrdered: 2750, kgReceived: 2782, diffKg: 32, unitPricePerKgNgn: 1720, coils: [{ coilNo: 'CL-26-2096', weightKg: 2782 }] }] },
  ],
  consumption: { totals: { kg: 45313, aluminiumKg: 11073, aluzincKg: 34240 }, stoneConsumedMetres: 2817, lines: [], jobsWithoutCoilConsumption: [], withoutJob: [] },
  exceptions: {
    priceVsPo: [{ coilNo: 'CL-26-2052', poID: 'PO-KD-26-0043', coilUnitCostNgnPerKg: 11500, poPricePerKgReceivedNgn: 7022.54, differencePct: 63.76, note: '' }],
    bookedLate: [{ coilNo: 'CL-26-2096', poID: 'PO-KD-26-0078', bookedISO: '2026-10-12', correctedReceivedISO: '2026-09-12', note: 'Delivered 12 Sep' }],
    grnDateMismatch: [],
    coilSpecDiffersFromPoLine: [],
    noUnitCost: [],
  },
};

describe('CoilRegisterPrintSections', () => {
  it('prints stock gross / spool / net, PO kg, consumption and exceptions', () => {
    render(<CoilRegisterPrintSections coilRegister={coilRegister} gapLines={[{ material: 'Aluzinc', coilNo: 'CL-1', jobId: 'J2', note: 'Gap' }]} />);
    expect(screen.getByText('Coil stock (gross and net of spool)')).toBeTruthy();
    expect(screen.getAllByText(/with received-date corrections/).length).toBe(1);
    expect(screen.getByText('Coil price differs from PO')).toBeTruthy();
    expect(screen.getByText('Received but booked late')).toBeTruthy();
    expect(screen.getByText('45,313 kg')).toBeTruthy();
  });

  it('builds Excel sheets including the corrected closing stock', () => {
    const names = coilRegisterExcelSheets(coilRegister, []).map((s) => s.name);
    expect(names).toEqual([
      'Coil_stock_start',
      'Coil_stock_end',
      'Coil_stock_end_corrected',
      'PO_kg_ordered_received',
      'Coil_consumption',
      'Jobs_no_coil_consumption',
      'Coil_exceptions',
      'Balance_gaps',
    ]);
  });
});
