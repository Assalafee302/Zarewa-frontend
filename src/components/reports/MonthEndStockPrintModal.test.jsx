import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthEndStockPrintContent } from './MonthEndStockPrintModal.jsx';
import { buildMonthEndStockReport } from '../../shared/lib/monthEndStockReportCore.js';

const report = buildMonthEndStockReport({
  asAtISO: '2026-08-31',
  rows: [
    { coilNo: 'CL-1', family: 'aluzinc', gaugeLabel: '0.40mm', colour: 'Blue', kgGross: 2000, spoolKg: 65, unitCostNgnPerKg: 1738 },
    { coilNo: 'CL-2', family: 'aluminium', gaugeLabel: '0.55mm', colour: 'Mill', kgGross: 900, spoolKg: 0, unitCostNgnPerKg: 7000 },
  ],
});

describe('MonthEndStockPrintContent', () => {
  it('prints the note, the five money/kg columns, subtotals and the grand total', () => {
    render(<MonthEndStockPrintContent report={report} />);
    expect(screen.getByText('Gross = weighed coil incl. spool; Net = gross − spool; value at net.')).toBeTruthy();
    for (const h of ['Gross kg', 'Spool kg', 'Net kg', 'Rate ₦/kg', 'Value ₦']) expect(screen.getByText(h)).toBeTruthy();
    expect(screen.getByText('Aluzinc 0.40mm — 1 coils')).toBeTruthy();
    expect(screen.getByText('Aluminium total — 1 coils')).toBeTruthy();
    expect(screen.getByText('Grand total — 2 coils')).toBeTruthy();
    // Value at net: 1,935 × 1,738 + 900 × 7,000
    expect(screen.getAllByText(`₦${(1935 * 1738 + 900 * 7000).toLocaleString('en-NG')}`).length).toBeGreaterThan(0);
  });
});
