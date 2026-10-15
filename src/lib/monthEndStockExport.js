import {
  MONTH_END_STOCK_NOTE,
  buildMonthEndStockReport,
  monthEndStockReportTableRows,
} from '../shared/lib/monthEndStockReportCore.js';

/** Month-end coil stock at the period end, from the material register's coil register (stock at that date). */
export function monthEndStockFromMaterialReport(materialReport) {
  const closing = materialReport?.coilRegister?.stock?.closing;
  if (!closing) return null;
  return buildMonthEndStockReport(closing);
}

/** Excel / CSV rows (one row per coil, a subtotal row after each gauge and material, grand total last). */
export function monthEndStockSheetRows(report) {
  return monthEndStockReportTableRows(report).map((r) => ({
    Line: r.kind === 'coil' ? '' : r.kind === 'gauge' ? 'Subtotal' : r.kind === 'material' ? 'Material total' : 'Grand total',
    Coil: r.coilNo,
    Material: r.material || '',
    Gauge: r.gauge || '',
    Colour: r.colour || '',
    'Gross kg': r.grossKg,
    'Spool kg': r.spoolKg,
    'Net kg': r.netKg,
    'Rate ₦/kg': r.kind === 'coil' ? r.rateNgnPerKg : '',
    'Value ₦': r.valueNgn,
    'Bought by': r.kind === 'coil' ? r.boughtBy || '' : '',
    'Cost source': r.kind === 'coil' ? r.costSource || '' : '',
  }));
}

/** Worksheet as an array of arrays: title, as-at date, the one-line note, a blank line, then the table. */
export function monthEndStockSheetAoa(report, { branchLabel = '' } = {}) {
  const rows = monthEndStockSheetRows(report);
  const head = rows.length ? Object.keys(rows[0]) : [];
  return [
    ['Month-end coil stock'],
    [`As at ${report?.asAtISO || ''}${branchLabel ? ` · ${branchLabel}` : ''}`],
    [MONTH_END_STOCK_NOTE],
    [],
    head,
    ...rows.map((r) => head.map((k) => r[k])),
  ];
}
