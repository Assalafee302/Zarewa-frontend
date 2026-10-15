#!/usr/bin/env node
/**
 * Rehearsal: 31 Aug 2026 Kaduna month-end coil stock from the material-register fixture (ERP export of 13 Oct 2026),
 * through the same code the Reports page uses. No network, no database.
 *   node scripts/month-end-stock-rehearsal.mjs <materialRegisterSource.json> <out.xlsx>
 */
import fs from 'node:fs';
import XLSX from 'xlsx';
import { buildCoilRegister } from '../src/shared/lib/coilRegisterCore.js';
import { buildMonthEndStockReport } from '../src/shared/lib/monthEndStockReportCore.js';
import { monthEndStockSheetAoa } from '../src/lib/monthEndStockExport.js';

const [src, out] = process.argv.slice(2);
const reg = buildCoilRegister(JSON.parse(fs.readFileSync(src, 'utf8')));
const rep = buildMonthEndStockReport(reg.stock.opening); // Sep register: opening = stock at 31 Aug
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(monthEndStockSheetAoa(rep, { branchLabel: 'Kaduna (rehearsal: ERP export 13 Oct 2026)' }));
ws['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 9 }, { wch: 44 }];
XLSX.utils.book_append_sheet(wb, ws, 'Month-end coil stock');
XLSX.writeFile(wb, out);
const n = (v) => Number(v).toLocaleString('en-NG', { maximumFractionDigits: 2 });
console.log(`As at ${rep.asAtISO} — ${rep.note}`);
for (const m of rep.materials) {
  for (const g of m.gauges) console.log(`  ${m.material} ${g.gauge}: ${g.subtotal.coilCount} coils | gross ${n(g.subtotal.grossKg)} | spool ${n(g.subtotal.spoolKg)} | net ${n(g.subtotal.netKg)} | ₦${n(g.subtotal.valueNgn)}`);
  console.log(`  ${m.material} TOTAL: ${m.subtotal.coilCount} coils | gross ${n(m.subtotal.grossKg)} | spool ${n(m.subtotal.spoolKg)} | net ${n(m.subtotal.netKg)} | ₦${n(m.subtotal.valueNgn)}`);
}
const t = rep.grandTotal;
console.log(`GRAND TOTAL: ${t.coilCount} coils | gross ${n(t.grossKg)} | spool ${n(t.spoolKg)} | net ${n(t.netKg)} | ₦${n(t.valueNgn)}`);
console.log(`register: gross value ₦${n(reg.stock.opening.totals.valueGrossNgn)} | net value (gross − spool value) ₦${n(reg.stock.opening.totals.valueNetNgn)}`);
console.log(`coils without a rate: ${rep.coilsWithoutRate.join(', ') || 'none'}`);
console.log(`metre-bought aluminium (no spool): ${rep.materials.flatMap((m) => m.gauges.flatMap((g) => g.rows)).filter((r) => r.boughtBy === 'metre').length}`);
console.log(out);
