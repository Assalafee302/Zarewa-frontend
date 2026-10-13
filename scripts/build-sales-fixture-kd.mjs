#!/usr/bin/env node
/**
 * Build the Kaduna Sep 2026 sales-report fixture from an ERP "all entered data" export (.xlsx).
 * Reads the workbook only; no database access.
 *
 *   node scripts/build-sales-fixture-kd.mjs <export.xlsx> [out.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const src = process.argv[2];
const out =
  process.argv[3] || path.join(process.cwd(), 'src/lib/__fixtures__/kd-2026-09/salesReportSource.json');
if (!src) {
  console.error('Usage: node scripts/build-sales-fixture-kd.mjs <export.xlsx> [out.json]');
  process.exit(1);
}

const wb = XLSX.readFile(src);
const sheet = (name) => {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet ${name} missing from ${src}`);
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
};
const pick = (row, keys) => Object.fromEntries(keys.map((k) => [k, row[k]]));
/** Blank cells come through as '' — the report treats null as "no value". */
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

const summary = sheet('Summary');
const meta = Object.fromEntries(summary.map((r) => Object.values(r).slice(0, 2)));

const accounts = sheet('Treasury_accounts').map((a) =>
  pick(a, ['id', 'name', 'bankName', 'type', 'accNo', 'branchId'])
);
const accountById = new Map(accounts.map((a) => [String(a.id), a]));

const receipts = sheet('Receipts').map((r) => ({
  ...pick(r, ['id', 'customerID', 'customer', 'quotationRef', 'dateISO', 'amountNgn', 'method', 'status', 'ledgerEntryId']),
  bankConfirmedAtISO: r.bankConfirmedAtISO || null,
  bankReceivedAmountNgn: numOrNull(r.bankReceivedAmountNgn),
}));

const ledgerEntries = sheet('Ledger').map((e) =>
  pick(e, ['id', 'atISO', 'type', 'customerID', 'customerName', 'amountNgn', 'quotationRef', 'paymentMethod', 'bankReference', 'note'])
);

const quotations = sheet('Quotations').map((q) =>
  pick(q, ['id', 'customerID', 'customer', 'dateISO', 'totalNgn', 'paidNgn', 'paymentStatus', 'status'])
);

const productionJobs = sheet('Production_jobs').map((j) =>
  pick(j, ['jobID', 'quotationRef', 'customerName', 'productID', 'status', 'completedAtISO', 'endDateISO'])
);

const treasuryMovements = sheet('Treasury_movements').map((t) => {
  const acc = accountById.get(String(t.treasuryAccountId)) || {};
  return {
    ...pick(t, [
      'id', 'postedAtISO', 'type', 'treasuryAccountId', 'accountName', 'amountNgn', 'reference',
      'counterpartyName', 'sourceKind', 'sourceId', 'reversesMovementId',
    ]),
    accountType: acc.type || '',
    bankName: acc.bankName || '',
  };
});

const refunds = sheet('Refunds').map((r) =>
  pick(r, ['refundID', 'customer', 'quotationRef', 'reasonCategory', 'amountNgn', 'status', 'requestedAtISO', 'approvedAmountNgn', 'paidAmountNgn', 'paidAtISO', 'creditAppliedNgn'])
);

const fixture = {
  _meta: {
    source: `ERP export ${path.basename(src)} (branch scope ${meta['Branch scope'] || '?'}, generated ${meta.Generated || '?'}). Columns trimmed to what the sales report reads.`,
    missingFromExport: [
      'quotations.managerClearedAtISO and paymentBalanceWaivedNgn (debtor list only)',
      'receipts.financeReconciliationSavedAtISO (only matters when bank amount equals the allocation)',
      'refunds.payoutHistory (settled date falls back to paidAtISO)',
    ],
  },
  branch: { id: meta['Branch scope'] || 'BR-KD' },
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  treasuryAccounts: accounts,
  receipts,
  ledgerEntries,
  quotations,
  productionJobs,
  treasuryMovements,
  refunds,
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(fixture));
console.log(
  `Wrote ${out}: receipts ${receipts.length}, ledger ${ledgerEntries.length}, quotations ${quotations.length}, ` +
    `jobs ${productionJobs.length}, treasury ${treasuryMovements.length}, refunds ${refunds.length}`
);
