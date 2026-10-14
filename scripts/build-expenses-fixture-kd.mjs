#!/usr/bin/env node
/**
 * Build the Kaduna Sep 2026 expenses-report fixture from an ERP "all entered data" export (.xlsx).
 * Reads the workbook only; no database access.
 *
 *   node scripts/build-expenses-fixture-kd.mjs <export.xlsx> [out.json]
 *
 * Not in the export: HR payroll (the payroll split is an optional report input).
 */
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const src = process.argv[2];
const out =
  process.argv[3] || path.join(process.cwd(), 'src/lib/__fixtures__/kd-2026-09/expensesReportSource.json');
if (!src) {
  console.error('Usage: node scripts/build-expenses-fixture-kd.mjs <export.xlsx> [out.json]');
  process.exit(1);
}

const wb = XLSX.readFile(src);
const sheet = (name) => {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet ${name} missing from ${src}`);
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
};
const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k]]));
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
const meta = Object.fromEntries(sheet('Summary').map((r) => Object.values(r).slice(0, 2)));

const expenses = sheet('Expenses').map((e) =>
  pick(e, ['expenseID', 'date', 'category', 'expenseType', 'amountNgn', 'paymentMethod', 'reference'])
);
const paymentRequests = sheet('Payment_requests').map((r) => ({
  ...pick(r, ['requestID', 'expenseID', 'requestDate', 'amountRequestedNgn', 'approvalStatus', 'description', 'paidAtISO', 'expenseCategory', 'staffDisplayName']),
  paidAmountNgn: numOrNull(r.paidAmountNgn),
}));
const treasuryMovements = sheet('Treasury_movements')
  .filter((t) => t.type === 'TRANSPORT_PAYMENT')
  .map((t) => pick(t, ['id', 'postedAtISO', 'type', 'amountNgn', 'sourceKind', 'sourceId', 'counterpartyName', 'reference', 'note']));
const purchaseOrders = sheet('Purchase_orders').map((p) =>
  pick(p, ['poID', 'orderDateISO', 'supplierName', 'transportAgentName', 'transportAmountNgn', 'transportPaidNgn'])
);
const refunds = sheet('Refunds').map((r) =>
  pick(r, ['refundID', 'customer', 'quotationRef', 'amountNgn', 'approvedAmountNgn', 'paidAmountNgn', 'paidAtISO', 'status', 'requestedAtISO'])
);

const fixture = {
  _meta: {
    source: `ERP export ${path.basename(src)} (branch scope ${meta['Branch scope'] || '?'}, generated ${meta.Generated || '?'}). Columns trimmed to what the expenses report reads.`,
    missingFromExport: ['HR payroll (payroll split is an optional report input)'],
  },
  branch: { id: meta['Branch scope'] || 'BR-KD' },
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  expenses,
  paymentRequests,
  treasuryMovements,
  purchaseOrders,
  refunds,
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fixture));
console.log(
  `Wrote ${out}: expenses ${expenses.length}, payment requests ${paymentRequests.length}, ` +
    `PO transport lines ${treasuryMovements.length}, POs ${purchaseOrders.length}, refunds ${refunds.length}`
);
