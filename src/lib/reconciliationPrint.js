import { formatNgn } from '../Data/mockData';
import { escapeHtml, openPrintHtmlDocument } from './officeDeskPrint';
import { isReceiptPendingClearance, pendingClearanceTotalNgn, receiptEffectiveCashNgn, receiptRegisteredByLabel } from './receiptClearance';
import {
  hangingRefundIndicatorsByCustomerId,
} from './refundsStore';
import { quotationsStillToBalanceRows, quotationEffectivePaidNgn } from './quotationPaymentSummary.js';
import { normSalesQuotationRefKey, receiptLedgerReceiptTreasurySplits } from './salesReceiptsList';

/** Print cell for same-customer open refunds / unapplied overpay credit (indicator only). */
export function formatHangingRefundPrintCell(indicator) {
  if (!indicator) return '—';
  const parts = [indicator.shortLabel];
  if (indicator.count > 0) parts.push(formatNgn(indicator.totalOpenNgn));
  if ((indicator.overpayCreditNgn || 0) > 0) {
    parts.push(
      indicator.count > 0
        ? `Unapplied credit ${formatNgn(indicator.overpayCreditNgn)}`
        : formatNgn(indicator.overpayCreditNgn)
    );
  }
  const detail = String(indicator.detailLabel || '').trim();
  if (detail) parts.push(detail);
  return parts.join(' · ');
}

function formatPrintMeters(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`;
}

/** @param {object[]} customers */
function customerPhoneByIdMap(customers = []) {
  const map = new Map();
  for (const c of customers || []) {
    const id = String(c?.customerID || c?.id || '').trim();
    if (!id || map.has(id)) continue;
    const phone = String(c?.phoneNumber || c?.phone || '').trim();
    if (phone) map.set(id, phone);
  }
  return map;
}

/** @param {object[]} quotations */
function quotationMaterialByRefMap(quotations = []) {
  const map = new Map();
  for (const q of quotations || []) {
    const key = normSalesQuotationRefKey(q?.id || q?.quotationRef);
    if (!key || map.has(key)) continue;
    const colour = String(q?.materialColor ?? q?.material_color ?? q?.color ?? '').trim();
    const gauge = String(q?.materialGauge ?? q?.material_gauge ?? q?.gauge ?? '').trim();
    map.set(key, { colour: colour || '—', gauge: gauge || '—' });
  }
  return map;
}

/** @param {object[]} cuttingLists */
function cuttingListSummaryByQuoteRefMap(cuttingLists = []) {
  const map = new Map();
  for (const cl of cuttingLists || []) {
    const key = normSalesQuotationRefKey(cl?.quotationRef);
    if (!key || map.has(key)) continue;
    const metres = Number(cl?.totalMeters);
    const id = String(cl?.id || '').trim();
    map.set(key, {
      id,
      totalMetersLabel: formatPrintMeters(metres),
      cuttingListLabel: id || 'Cutting list',
    });
  }
  return map;
}

/** Customer name with phone when available (print column). */
export function formatReceiptCustomerWithPhone(receipt, phoneByCustomerId) {
  const name = String(receipt?.customer || receipt?.customerName || '—').trim() || '—';
  const customerId = String(receipt?.customerID || '').trim();
  const phone =
    String(receipt?.customerPhone || receipt?.phoneNumber || '').trim() ||
    (customerId && phoneByCustomerId?.get?.(customerId)) ||
    '';
  if (!phone || phone === '—') return name;
  return name === '—' ? phone : `${name} · ${phone}`;
}

function renderPrintDataTable(columns, rows) {
  const cols = Array.isArray(columns) ? columns : [];
  const data = Array.isArray(rows) ? rows : [];
  const headerCells = cols
    .map(
      (c) =>
        `<th${c.align === 'right' ? ' class="num"' : ''}>${escapeHtml(c.label)}</th>`
    )
    .join('');
  const bodyRows = data
    .map((row) => {
      const cells = cols
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
  return `<table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${
      bodyRows ||
      `<tr><td colspan="${Math.max(1, cols.length)}">No rows.</td></tr>`
    }</tbody>
  </table>`;
}

/** Plain table print — matches treasury account statement (lines + data only). */
export function buildReconciliationListPrintHtml(payload) {
  const title = String(payload?.title || 'Reconciliation list');
  const periodLabel = String(payload?.periodLabel || '').trim();
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const extraSections = Array.isArray(payload?.extraSections) ? payload.extraSections : [];
  const summaryLines = Array.isArray(payload?.summaryLines) ? payload.summaryLines : [];
  const isLandscape = payload?.layout !== 'portrait';

  const summaryHtml = summaryLines
    .map(
      (line) =>
        `<p class="meta"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</p>`
    )
    .join('');

  const extraHtml = extraSections
    .filter((section) => Array.isArray(section?.rows) && section.rows.length > 0)
    .map((section) => {
      const heading = String(section.heading || '').trim();
      const note = String(section.note || '').trim();
      return `${heading ? `<h2>${escapeHtml(heading)}</h2>` : ''}
      ${note ? `<p class="meta">${escapeHtml(note)}</p>` : ''}
      ${renderPrintDataTable(section.columns, section.rows)}`;
    })
    .join('');

  const pageRule = isLandscape
    ? '@page { size: A4 landscape; margin: 12mm; }'
    : '@page { size: A4 portrait; margin: 12mm; }';

  const mainHeading = extraHtml && rows.length ? '<h2>Receipts pending confirmation</h2>' : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageRule}
    body { font-family: Arial, sans-serif; margin: 24px; color: #000; }
    h1 { margin: 0 0 8px; font-size: 20px; font-weight: bold; }
    h2 { margin: 20px 0 8px; font-size: 14px; font-weight: bold; }
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
  ${mainHeading}
  ${rows.length || !extraHtml ? renderPrintDataTable(columns, rows) : ''}
  ${extraHtml}
</body>
</html>`;
}

export function reconciliationPrintHasRows(payload) {
  if (payload?.rows?.length) return true;
  return (Array.isArray(payload?.extraSections) ? payload.extraSections : []).some(
    (section) => Array.isArray(section?.rows) && section.rows.length > 0
  );
}

/** @param {ReturnType<typeof unreconciledReceiptsPrintPayload>} payload */
export function openReconciliationListPrint(payload) {
  if (!reconciliationPrintHasRows(payload)) return false;
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
 * @param {{
 *   branchLabel?: string;
 *   generatedAt?: Date;
 *   customers?: object[];
 *   quotations?: object[];
 *   cuttingLists?: object[];
 *   refunds?: object[];
 *   ledgerEntries?: object[];
 *   salesReceipts?: object[];
 * }} [opts]
 */
export function unreconciledReceiptsPrintPayload(receipts, treasuryMovements = [], opts = {}) {
  const phoneByCustomerId = customerPhoneByIdMap(opts.customers);
  const materialByQuote = quotationMaterialByRefMap(opts.quotations);
  const cuttingByQuote = cuttingListSummaryByQuoteRefMap(opts.cuttingLists);
  const hangingByCustomer = hangingRefundIndicatorsByCustomerId(opts.refunds, opts.ledgerEntries);
  const payOpts = {
    salesReceipts: Array.isArray(opts.salesReceipts) && opts.salesReceipts.length ? opts.salesReceipts : receipts,
    ledgerEntries: opts.ledgerEntries,
  };
  const quoteByRef = new Map();
  for (const q of opts.quotations || []) {
    const key = normSalesQuotationRefKey(q?.id || q?.quotationID || q?.quotationRef);
    if (key && !quoteByRef.has(key)) quoteByRef.set(key, q);
  }

  let receiptsWithHangingRefund = 0;
  let receiptsWithoutCuttingList = 0;

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
      const qKey = normSalesQuotationRefKey(r.quotationRef);
      const material = qKey ? materialByQuote.get(qKey) : null;
      const cutting = qKey ? cuttingByQuote.get(qKey) : null;
      const quote = qKey ? quoteByRef.get(qKey) : null;
      const stillDueNgn = quote
        ? Math.max(
            0,
            Math.round(Number(quote.totalNgn ?? quote.total_ngn) || 0) - quotationEffectivePaidNgn(quote, payOpts)
          )
        : 0;
      const customerId = String(r.customerID || '').trim();
      const hanging = customerId ? hangingByCustomer.get(customerId) : null;
      if (hanging) receiptsWithHangingRefund += 1;
      const cuttingListLabel = cutting?.cuttingListLabel
        ? cutting.cuttingListLabel
        : qKey
          ? 'No cutting list'
          : 'No quotation';
      if (!cutting?.id) receiptsWithoutCuttingList += 1;
      return {
        receiptId: String(r.id || '—'),
        receiptDate: String(r.dateISO || r.date || '—'),
        customer: formatReceiptCustomerWithPhone(r, phoneByCustomerId),
        quotationRef: String(r.quotationRef || '—'),
        amountReceived: formatNgn(cash),
        stillDue: stillDueNgn > 0 ? formatNgn(stillDueNgn) : '—',
        treasuryAccounts: accounts,
        registeredBy: receiptRegisteredByLabel(r, opts.ledgerEntries) || '—',
        colour: material?.colour || '—',
        gauge: material?.gauge || '—',
        cuttingList: cuttingListLabel,
        totalMeters: cutting?.totalMetersLabel || '—',
        hangingRefund: formatHangingRefundPrintCell(hanging),
        status: stillDueNgn > 0 ? 'Pending clearance · partial' : 'Pending clearance',
      };
    });

  const partialQuotes = quotationsStillToBalanceRows(opts.quotations, payOpts);
  const partialQuoteRows = partialQuotes.map((row) => {
    const qKey = normSalesQuotationRefKey(row.id);
    const material = qKey ? materialByQuote.get(qKey) : null;
    const cutting = qKey ? cuttingByQuote.get(qKey) : null;
    return {
      quoteDate: row.date || '—',
      quotationRef: row.id || '—',
      customer: formatReceiptCustomerWithPhone(
        { customer: row.customer, customerID: row.customerID },
        phoneByCustomerId
      ),
      colour: material?.colour || '—',
      gauge: material?.gauge || '—',
      paid: formatNgn(row.paid),
      quoteTotal: formatNgn(row.total),
      stillDue: formatNgn(row.balance),
      cuttingList: cutting?.cuttingListLabel || (qKey ? 'No cutting list' : '—'),
      totalMeters: cutting?.totalMetersLabel || '—',
      status: 'Partial — balance due',
    };
  });
  const partialBalanceTotalNgn = partialQuotes.reduce((s, row) => s + row.balance, 0);

  const extraSections = partialQuoteRows.length
    ? [
        {
          heading: 'Quotations still to balance (partial payment)',
          note: 'Customers who already paid part of the quote and still have a remaining balance.',
          columns: [
            { key: 'quoteDate', label: 'Date' },
            { key: 'quotationRef', label: 'Quotation' },
            { key: 'customer', label: 'Customer' },
            { key: 'colour', label: 'Colour' },
            { key: 'gauge', label: 'Gauge' },
            { key: 'paid', label: 'Paid', align: 'right' },
            { key: 'quoteTotal', label: 'Quote total', align: 'right' },
            { key: 'stillDue', label: 'Balance due', align: 'right' },
            { key: 'cuttingList', label: 'Cutting list' },
            { key: 'totalMeters', label: 'Total metres', align: 'right' },
            { key: 'status', label: 'Status' },
          ],
          rows: partialQuoteRows,
        },
      ]
    : [];

  const branchLabel = String(opts.branchLabel || '').trim();
  const generatedAt = opts.generatedAt instanceof Date ? opts.generatedAt : new Date();
  const totalNgn = pendingClearanceTotalNgn(receipts);

  return {
    title: extraSections.length
      ? 'Receipts pending confirmation & partial balances'
      : 'Unreconciled customer receipts',
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
      { key: 'stillDue', label: 'Still due', align: 'right' },
      { key: 'treasuryAccounts', label: 'Bank / cash account' },
      { key: 'registeredBy', label: 'Registered by' },
      { key: 'colour', label: 'Colour' },
      { key: 'gauge', label: 'Gauge' },
      { key: 'cuttingList', label: 'Cutting list' },
      { key: 'totalMeters', label: 'Total metres', align: 'right' },
      { key: 'hangingRefund', label: 'Hanging refund' },
      { key: 'status', label: 'Status' },
    ],
    rows,
    extraSections,
    summaryLines: [
      { label: 'Receipts pending clearance', value: String(rows.length) },
      { label: 'Total awaiting reconciliation', value: formatNgn(totalNgn) },
      { label: 'Partial quotations still to balance', value: String(partialQuoteRows.length) },
      { label: 'Remaining quote balances', value: formatNgn(partialBalanceTotalNgn) },
      { label: 'Pending receipts without cutting list', value: String(receiptsWithoutCuttingList) },
      {
        label: 'Receipts with same-customer hanging refund / unapplied overpay credit (indicator only)',
        value: String(receiptsWithHangingRefund),
      },
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
