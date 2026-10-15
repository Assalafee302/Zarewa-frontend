#!/usr/bin/env node
/**
 * 31 Aug 2026 Kaduna coil stock: ERP month-end coil stock (material register, value at net) vs the accounts book
 * (coils_31Aug_final.csv: coilNo, mat, gaugeLabel, kg, rate, rate2, gross, spool, net). Read-only, no database.
 *   node scripts/month-end-stock-book-recon.mjs <materialRegisterSource.json> <coils_31Aug_final.csv> <out.xlsx>
 * Per coil the naira difference (book − ERP) is split into: weight (Δkg × ERP rate), spool (−Δspool × ERP rate),
 * rate (Δrate × book net kg). The three parts add up to the difference.
 */
import fs from 'node:fs';
import XLSX from 'xlsx';
import { buildCoilRegister } from '../src/shared/lib/coilRegisterCore.js';
import { buildMonthEndStockReport } from '../src/shared/lib/monthEndStockReportCore.js';

const [srcJson, csvPath, out] = process.argv.slice(2);
const rep = buildMonthEndStockReport(buildCoilRegister(JSON.parse(fs.readFileSync(srcJson, 'utf8'))).stock.opening);
const erp = new Map(rep.materials.flatMap((m) => m.gauges.flatMap((g) => g.rows)).map((r) => [r.coilNo, r]));

const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const head = lines[0].split(',').map((s) => s.trim());
const book = new Map();
for (const line of lines.slice(1)) {
  const cells = line.split(',');
  const row = Object.fromEntries(head.map((h, i) => [h, cells[i]?.trim()]));
  const kg = Number(row.kg) || 0;
  const spool = Number(row.spool) || 0;
  // The book's gross / net ₦ use rate2 (rate is the listed price): rate2 is the effective book rate.
  const rate = Number(row.rate2) || Number(row.rate) || 0;
  book.set(row.coilNo, { coilNo: row.coilNo, mat: row.mat, gauge: row.gaugeLabel, kg, spool, rate, netKg: Math.max(0, kg - spool), valueNgn: Number(row.net) || 0, rate2: Number(row.rate2) || 0, listedRate: Number(row.rate) || 0 });
}

const r2 = (n) => Math.round(n * 100) / 100;
const rows = [];
for (const coilNo of new Set([...book.keys(), ...erp.keys()])) {
  const b = book.get(coilNo);
  const e = erp.get(coilNo);
  const bVal = b?.valueNgn ?? 0;
  const eVal = e?.valueNgn ?? 0;
  const diff = Math.round(bVal - eVal);
  let weight = 0, spool = 0, rate = 0, why = '';
  if (b && e) {
    weight = Math.round((b.kg - e.grossKg) * e.rateNgnPerKg);
    spool = Math.round(-(b.spool - e.spoolKg) * e.rateNgnPerKg);
    rate = diff - weight - spool; // = Δrate × book net kg, plus rounding
    const parts = [];
    if (Math.abs(b.kg - e.grossKg) > 0.005) parts.push(`kg ${r2(e.grossKg)} → ${r2(b.kg)}`);
    if (Math.abs(b.spool - e.spoolKg) > 0.005) parts.push(`spool ${r2(e.spoolKg)} → ${r2(b.spool)}`);
    if (Math.abs(b.rate - e.rateNgnPerKg) > 0.005) parts.push(`rate ${r2(e.rateNgnPerKg)} → ${r2(b.rate)}`);
    why = parts.join('; ');
  } else if (b) {
    why = 'in the book only (not in ERP stock at 31 Aug)';
  } else {
    why = 'in ERP stock only (not in the book)';
  }
  if (!diff && !why) continue;
  rows.push({
    coilNo,
    material: e?.material || b?.mat || '',
    gauge: e?.gauge || b?.gauge || '',
    erpKg: e?.grossKg ?? '', bookKg: b?.kg ?? '',
    erpSpool: e?.spoolKg ?? '', bookSpool: b?.spool ?? '',
    erpRate: e?.rateNgnPerKg ?? '', bookRate: b?.rate ?? '',
    erpValueNgn: eVal, bookValueNgn: bVal, differenceNgn: diff,
    weightEffectNgn: b && e ? weight : '', spoolEffectNgn: b && e ? spool : '', rateEffectNgn: b && e ? rate : '',
    erpCostSource: e?.costSource || '', erpBoughtBy: e?.boughtBy || '', erpReceived: e?.receivedISO || '',
    what: why,
  });
}
rows.sort((a, b) => Math.abs(b.differenceNgn) - Math.abs(a.differenceNgn));
const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const bookTotal = [...book.values()].reduce((s, r) => s + r.valueNgn, 0);
const erpTotal = rep.grandTotal.valueNgn;
const summary = {
  erpCoils: rep.grandTotal.coilCount, bookCoils: book.size,
  erpNetValueNgn: erpTotal, bookNetValueNgn: bookTotal, differenceNgn: bookTotal - erpTotal,
  explainedByListedCoilsNgn: sum('differenceNgn'),
  weightNgn: sum('weightEffectNgn'), spoolNgn: sum('spoolEffectNgn'), rateNgn: sum('rateEffectNgn'),
  bookOnlyNgn: rows.filter((r) => r.erpValueNgn === 0 && r.bookValueNgn).reduce((s, r) => s + r.differenceNgn, 0),
  erpOnlyNgn: rows.filter((r) => r.bookValueNgn === 0 && r.erpValueNgn).reduce((s, r) => s + r.differenceNgn, 0),
  bookKg: r2([...book.values()].reduce((s, r) => s + r.kg, 0)), erpKg: rep.grandTotal.grossKg,
  bookSpool: r2([...book.values()].reduce((s, r) => s + r.spool, 0)), erpSpool: rep.grandTotal.spoolKg,
  bookRowsWhereListedRateDiffersFromRate2: [...book.values()].filter((r) => r.listedRate && r.rate2 && r.listedRate !== r.rate2).map((r) => r.coilNo),
  bookValueCheck: [...book.values()].filter((r) => Math.abs(r.netKg * r.rate - r.valueNgn) > 1).map((r) => r.coilNo),
};
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(summary).map(([k, v]) => ({ item: k, value: Array.isArray(v) ? v.join(', ') : v }))), 'Summary');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Coils that differ');
XLSX.writeFile(wb, out);
console.log(JSON.stringify(summary, null, 1));
for (const r of rows) console.log([r.coilNo, r.material, r.gauge, `diff ${r.differenceNgn}`, `kg ${r.weightEffectNgn}`, `spool ${r.spoolEffectNgn}`, `rate ${r.rateEffectNgn}`, '|', r.what, '|', r.erpCostSource, r.erpReceived].join(' '));
