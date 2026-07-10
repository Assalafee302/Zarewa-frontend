import { formatNgn } from '../Data/mockData';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint';
import { isReceiptPendingClearance, pendingClearanceTotalNgn, receiptEffectiveCashNgn } from './receiptClearance';
import { receiptLedgerReceiptTreasurySplits } from './salesReceiptsList';

/** Plain table print — matches treasury account statement (lines + data only). */
export function buildReconciliationListPrintHtml(payload) {
  const title = String(payload?.title || 'Reconciliation list');
  const periodLabel = String(payload?.periodLabel || '').trim();
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const summaryLines = Array.isArray(payload?.summaryLines) ? payload.summaryLines : [];
  const isLandscape = payload?.layout !== 'portrait';

  const headerCells = columns
    .map(
      (c) =>
        `<th${c.align === 'right' ? ' class="num"' : ''}>${escapeHtml(c.label)}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const raw = row[c.key];
          const text = raw != null && raw !== '' ? String(raw) : '—';
          const cls = c.align === 'right' ? ' class="num"' : '';
          return `<td${cls}>${escapeHtml(text)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const summaryHtml = summaryLines
    .map(
      (line) =>
        `<p class="meta"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</p>`
    )
    .join('');

  const pageRule = isLandscape
    ? '@page { size: A4 landscape; margin: 12mm; }'
    : '@page { size: A4 portrait; margin: 12mm; }';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageRule}
    body { font-family: Arial, sans-serif; margin: 24px; color: #000; }
    h1 { margin: 0 0 8px; font-size: 20px; font-weight: bold; }
    p.meta { margin: 0 0 4px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; line-height: 1.25; }
    th { text-align: left; font-weight: bold; }
    td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${periodLabel ? `<p class="meta">${escapeHtml(periodLabel)}</p>` : ''}
  ${summaryHtml}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${
      bodyRows ||
      `<tr><td colspan="${Math.max(1, columns.length)}">No rows.</td></tr>`
    }</tbody>
  </table>
</body>
</html>`;
}

/** @param {ReturnType<typeof unreconciledReceiptsPrintPayload>} payload */
export function openReconciliationListPrint(payload) {
  if (!payload?.rows?.length) return false;
  const html = buildReconciliationListPrintHtml(payload);
  return openPrintHtmlDocument(html, payload.title || 'Reconciliation list');
}

const UNRECONCILED_BANK_STATUSES = new Set(['Review', 'PendingManager']);

/** @param {object[]} lines */
export function unreconciledBankReconciliationLines(lines = []) {
  return (Array.isArray(lines) ? lines : []).filter((l) =>
    UNRECONCILED_BANK_STATUSES.has(String(l?.status || '').trim())
  );
}

/** @param {object[]} receipts */
export function unreconciledReceiptRows(receipts = []) {
  return (Array.isArray(receipts) ? receipts : []).filter((r) => isReceiptPendingClearance(r));
}

/**
 * Print payload for customer receipts awaiting finance clearance / reconciliation.
 * @param {object[]} receipts
 * @param {object[]} treasuryMovements
 * @param {{ branchLabel?: string; generatedAt?: Date }} [opts]
 */
export function unreconciledReceiptsPrintPayload(receipts, treasuryMovements = [], opts = {}) {
  const rows = unreconciledReceiptRows(receipts)
    .slice()
    .sort((a, b) => {
      const da = String(a.dateISO || a.date || '');
      const db = String(b.dateISO || b.date || '');
      if (da !== db) return da.localeCompare(db);
      return String(a.id || '').localeCompare(String(b.id || ''));
    })
    .map((r) => {
      const cash = receiptEffectiveCashNgn(r);
      const splits = receiptLedgerReceiptTreasurySplits(r, treasuryMovements);
      const accounts =
        splits.length > 0
          ? splits.map((s) => `${s.accountLabel} (${formatNgn(s.amountNgn)})`).join('; ')
          : '—';
      return {
        receiptId: String(r.id || '—'),
        receiptDate: String(r.dateISO || r.date || '—'),
        customer: String(r.customer || '—'),
        quotationRef: String(r.quotationRef || '—'),
        amountReceived: formatNgn(cash),
        treasuryAccounts: accounts,
        status: 'Pending clearance',
        reference: String(r.bankReference || r.method || r.paymentMethod || '—'),
      };
    });

  const branchLabel = String(opts.branchLabel || '').trim();
  const generatedAt = opts.generatedAt instanceof Date ? opts.generatedAt : new Date();
  const totalNgn = pendingClearanceTotalNgn(receipts);

  return {
    title: 'Unreconciled customer receipts',
    periodLabel: branchLabel
      ? `${branchLabel} · as at ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
      : `As at ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`,
    documentTypeLabel: 'Finance reconciliation',
    layout: 'landscape',
    denseSingleLine: true,
    columns: [
      { key: 'receiptId', label: 'Receipt' },
      { key: 'receiptDate', label: 'Date' },
      { key: 'customer', label: 'Customer' },
      { key: 'quotationRef', label: 'Quotation' },
      { key: 'amountReceived', label: 'Received', align: 'right' },
      { key: 'treasuryAccounts', label: 'Bank / cash account' },
      { key: 'reference', label: 'Reference / method' },
      { key: 'status', label: 'Status' },
    ],
    rows,
    summaryLines: [
      { label: 'Receipts pending clearance', value: String(rows.length) },
      { label: 'Total awaiting reconciliation', value: formatNgn(totalNgn) },
    ],
  };
}

/**
 * Print payload for bank statement lines not yet matched.
 * @param {object[]} lines
 * @param {{ branchLabel?: string; generatedAt?: Date }} [opts]
 */
export function unreconciledBankLinesPrintPayload(lines, opts = {}) {
  const pendingRaw = unreconciledBankReconciliationLines(lines)
    .slice()
    .sort((a, b) => {
      const da = String(a.bankDateISO || '');
      const db = String(b.bankDateISO || '');
      if (da !== db) return da.localeCompare(db);
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  const pending = pendingRaw.map((l) => ({
      lineId: String(l.id || '—'),
      bankDate: String(l.bankDateISO || '—'),
      description: String(l.description || '—'),
      amountNgn: formatNgn(l.amountNgn),
      status: String(l.status || 'Review'),
      systemMatch: String(l.systemMatch || '').trim() || '—',
    }));

  const branchLabel = String(opts.branchLabel || '').trim();
  const generatedAt = opts.generatedAt instanceof Date ? opts.generatedAt : new Date();
  const totalNgn = pendingRaw.reduce((s, l) => s + Math.round(Number(l.amountNgn) || 0), 0);

  return {
    title: 'Unreconciled bank statement lines',
    periodLabel: branchLabel
      ? `${branchLabel} · as at ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
      : `As at ${generatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`,
    documentTypeLabel: 'Bank reconciliation',
    layout: 'landscape',
    denseSingleLine: true,
    columns: [
      { key: 'lineId', label: 'Line id' },
      { key: 'bankDate', label: 'Bank date' },
      { key: 'description', label: 'Description' },
      { key: 'amountNgn', label: 'Amount', align: 'right' },
      { key: 'status', label: 'Status' },
      { key: 'systemMatch', label: 'System match' },
    ],
    rows: pending,
    summaryLines: [
      { label: 'Lines to review', value: String(pending.length) },
      { label: 'Net amount (signed)', value: formatNgn(totalNgn) },
    ],
  };
}
