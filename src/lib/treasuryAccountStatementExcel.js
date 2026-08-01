import * as XLSX from 'xlsx';
import { treasuryMovementSourceBadge, treasuryMovementStatementLabel } from './accountCore.js';

/**
 * Build a dated treasury account statement with opening/running balances.
 * @param {{
 *   account: { id?: number|string; name?: string; bankName?: string; balance?: number; openingBalanceNgn?: number|null };
 *   movements: object[];
 *   fromDate: string;
 *   toDate: string;
 * }} opts
 * @returns {{
 *   ok: true;
 *   accountTitle: string;
 *   fromDate: string;
 *   toDate: string;
 *   openingBalanceNgn: number;
 *   closingBalanceNgn: number;
 *   totals: { in: number; out: number };
 *   rows: Array<{
 *     lineNo: number;
 *     date: string;
 *     source: string;
 *     description: string;
 *     reference: string;
 *     sourceId: string;
 *     movementId: string|number;
 *     inNgn: number|null;
 *     outNgn: number|null;
 *     balanceNgn: number;
 *     amountNgn: number;
 *   }>;
 * } | { ok: false; error: string }}
 */
export function buildTreasuryAccountStatementPeriod({ account, movements, fromDate, toDate }) {
  const from = String(fromDate || '').trim().slice(0, 10);
  const to = String(toDate || '').trim().slice(0, 10);
  if (!account) return { ok: false, error: 'Select a treasury account first.' };
  if (!from || !to) return { ok: false, error: 'Select both start and end dates.' };
  if (from > to) return { ok: false, error: 'Start date cannot be after end date.' };

  const accountId = Number(account.id);
  const accountMovements = (Array.isArray(movements) ? movements : [])
    .filter((m) => Number(m.treasuryAccountId) === accountId)
    .slice()
    .sort((a, b) => {
      const ta = String(a.postedAtISO || '');
      const tb = String(b.postedAtISO || '');
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

  const rangeLines = accountMovements.filter((line) => {
    const date = String(line.postedAtISO || '').slice(0, 10);
    return date >= from && date <= to;
  });
  if (rangeLines.length === 0) {
    return { ok: false, error: 'No statement lines found for the selected date range.' };
  }

  const totalMovementsNgn = accountMovements.reduce((sum, line) => sum + (Number(line.amountNgn) || 0), 0);
  const currentBookBalanceNgn = Number(account.balance) || 0;
  const impliedOpeningFromPostingsNgn = currentBookBalanceNgn - totalMovementsNgn;
  const regOpeningRaw = account.openingBalanceNgn;
  const openingBookBalanceNgn = Math.round(
    Number(
      regOpeningRaw !== undefined && regOpeningRaw !== null ? regOpeningRaw : impliedOpeningFromPostingsNgn
    ) || 0
  );
  const openingBalanceNgn = accountMovements.reduce((sum, line) => {
    const date = String(line.postedAtISO || '').slice(0, 10);
    return date < from ? sum + (Number(line.amountNgn) || 0) : sum;
  }, openingBookBalanceNgn);

  let runningBalanceNgn = openingBalanceNgn;
  const totals = { in: 0, out: 0 };
  const rows = rangeLines.map((line, index) => {
    const amount = Number(line.amountNgn) || 0;
    if (amount > 0) totals.in += amount;
    if (amount < 0) totals.out += Math.abs(amount);
    runningBalanceNgn += amount;
    return {
      lineNo: index + 1,
      date: String(line.postedAtISO || '').slice(0, 10),
      source: treasuryMovementSourceBadge(line).label,
      description: treasuryMovementStatementLabel(line),
      reference: String(line.reference || '').trim(),
      sourceId: String(line.sourceId || '').trim(),
      movementId: line.id ?? '',
      inNgn: amount > 0 ? amount : null,
      outNgn: amount < 0 ? Math.abs(amount) : null,
      balanceNgn: runningBalanceNgn,
      amountNgn: amount,
    };
  });

  const accountTitle = `${account.name || 'Treasury account'}${account.bankName ? ` · ${account.bankName}` : ''}`;
  return {
    ok: true,
    accountTitle,
    fromDate: from,
    toDate: to,
    openingBalanceNgn,
    closingBalanceNgn: openingBalanceNgn + totals.in - totals.out,
    totals,
    rows,
  };
}

function safeFilePart(value) {
  return String(value || 'account')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'account';
}

/**
 * Download statement as Excel (.xlsx) — Summary + Lines sheets.
 * @param {Exclude<ReturnType<typeof buildTreasuryAccountStatementPeriod>, { ok: false }>} period
 */
export function downloadTreasuryAccountStatementXlsx(period) {
  if (!period?.ok) throw new Error(period?.error || 'Statement is empty.');
  const wb = XLSX.utils.book_new();
  const summary = [
    ['Account statement'],
    ['Account', period.accountTitle],
    ['Period from', period.fromDate],
    ['Period to', period.toDate],
    ['Exported at', new Date().toISOString()],
    [],
    ['Opening balance (NGN)', period.openingBalanceNgn],
    ['Total inflow (NGN)', period.totals.in],
    ['Total outflow (NGN)', period.totals.out],
    ['Closing balance (NGN)', period.closingBalanceNgn],
    ['Line count', period.rows.length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  const lineRows = period.rows.map((r) => ({
    '#': r.lineNo,
    Date: r.date,
    Source: r.source,
    Description: r.description,
    Reference: r.reference,
    'Source ID': r.sourceId,
    'Movement ID': r.movementId,
    'In (NGN)': r.inNgn,
    'Out (NGN)': r.outNgn,
    'Balance (NGN)': r.balanceNgn,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lineRows), 'Lines');

  const filename = `account-statement-${safeFilePart(period.accountTitle)}-${period.fromDate}-to-${period.toDate}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
