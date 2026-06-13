import { formatNgn } from '../Data/mockData';
import { isReceiptPendingClearance, pendingClearanceTotalNgn } from './receiptClearance';
import { receiptLedgerReceiptTreasurySplits } from './salesReceiptsList';

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
      const allocated = Math.round(Number(r.amountNgn) || 0);
      const cash =
        r.cashReceivedNgn != null ? Math.round(Number(r.cashReceivedNgn) || 0) : allocated;
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
