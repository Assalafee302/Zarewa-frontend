/**
 * Sales report v2 (Reports Phase 1). Pure: period source in → figures, rows, reconciliation out.
 *
 * Two figures, never mixed:
 * - **Cash received in period** — treasury by posting date: RECEIPT_IN + ADVANCE_IN − RECEIPT_REVERSAL_OUT,
 *   split by the treasury account actually posted to.
 * - **Recognised sales (produced in period)** — the sales report rows (both cash groups, see
 *   `salesPaymentsReceivedRows`), excluding receipts whose treasury receipt was fully reversed by period end.
 *   Suspended receipts that reached the bank and were never reversed stay in, marked suspended.
 *
 * A reconciliation walks from recognised sales to cash received, item by item, and ends with the
 * unexplained difference (expected ₦0).
 *
 * The pre-Phase-1 report stays reachable via `?legacy=1` (`salesPaymentsReceivedRows` is unchanged).
 */
import {
  SALES_REPORT_GROUP_NOT_PRODUCED,
  SALES_REPORT_GROUP_OUTSTANDING,
  SALES_REPORT_GROUP_PRODUCED,
  salesPaymentsReceivedRows,
} from './liveAnalytics.js';
import { abbreviateBankName } from './bankAbbreviation.js';
import { buildSalesAccrual } from './salesAccrualCore.js';

export const SALES_CASH_TREASURY_TYPES = ['RECEIPT_IN', 'ADVANCE_IN', 'RECEIPT_REVERSAL_OUT'];

export const SALES_RECON_RECEIVED_BEFORE_PERIOD = 'receivedBeforePeriod';
export const SALES_RECON_NO_TREASURY_IN_PERIOD = 'noTreasuryInPeriod';
export const SALES_RECON_AMOUNT_DIFFERS = 'amountDiffers';
export const SALES_RECON_TREASURY_NOT_IN_SALES = 'treasuryNotInSales';
export const SALES_RECON_ADVANCES = 'advances';
export const SALES_RECON_OTHER_TREASURY = 'otherTreasury';

export const SALES_EXCEPTION_NO_TREASURY = 'No treasury movement';
export const SALES_EXCEPTION_NO_TREASURY_IN_PERIOD = 'No treasury line in period';
export const SALES_EXCEPTION_AMOUNT_DIFFERS = 'Amount differs from treasury';

const RECON_LABELS = {
  [SALES_RECON_RECEIVED_BEFORE_PERIOD]: 'Less: received before the period (cash in an earlier month)',
  [SALES_RECON_NO_TREASURY_IN_PERIOD]: 'Less: receipts with no treasury line in the period',
  [SALES_RECON_AMOUNT_DIFFERS]: 'Less: receipt amount differs from treasury',
  [SALES_RECON_TREASURY_NOT_IN_SALES]: 'Add: bank receipts in the period not in recognised sales',
  [SALES_RECON_ADVANCES]: 'Add: customer advances received (ADVANCE_IN)',
  [SALES_RECON_OTHER_TREASURY]: 'Add: other treasury receipt lines',
};

const day = (v) => String(v || '').slice(0, 10);
const ngn = (v) => Math.round(Number(v) || 0);
const sumBy = (list, key) => list.reduce((s, r) => s + ngn(r[key]), 0);

export function isSuspendedReceiptStatus(status) {
  return /^suspended/i.test(String(status || '').trim());
}

/** Short label for the treasury account a line was posted to ("Cash", "Taj", "Moniepoint", …). */
export function treasuryAccountLabel(t) {
  if (String(t?.accountType || '').trim().toLowerCase() === 'cash') return 'Cash';
  return abbreviateBankName(t?.bankName) || String(t?.accountName || '').trim() || '—';
}

/**
 * Compare the receipt's method text with the accounts treasury actually credited.
 * @returns {string} '' when consistent or not comparable, else a short note.
 */
export function receiptMethodVersusTreasuryNote(method, postedAccountNames = []) {
  const text = String(method || '').trim();
  const posted = postedAccountNames.map((n) => String(n || '').trim()).filter(Boolean);
  if (!text || !posted.length) return '';
  if (/^split\b/i.test(text)) return '';
  if (/refund\s*fund/i.test(text)) {
    return `Method says refund fund; treasury shows a receipt into ${posted.join(' + ')}`;
  }
  const m = text.match(/^(?:bank|cash)\s*[—–-]\s*(.+)$/i);
  if (!m) return '';
  const named = m[1].trim().toLowerCase();
  if (posted.some((p) => p.toLowerCase() === named)) return '';
  return `Method says ${m[1].trim()}; posted to ${posted.join(' + ')}`;
}

/**
 * @param {object} input
 * @param {object[]} input.receipts
 * @param {object[]} input.productionJobs
 * @param {object[]} input.quotations
 * @param {object[]} input.ledgerEntries
 * @param {object[]} input.treasuryMovements — must cover the period; earlier lines sharpen the exceptions
 * @param {object[]} [input.refunds]
 * @param {object[]} [input.accrualTreasuryMovements] — full treasury history for the Accrual section
 *   (cash, reversals, refund payouts); falls back to `treasuryMovements`
 * @param {object[]} [input.quotationLines] — flat {quotationId, category, name, qty}
 * @param {object[]} [input.bankRecon]
 * @param {string} input.startDate
 * @param {string} input.endDate
 */
export function buildSalesReport(input = {}) {
  const {
    receipts = [],
    productionJobs = [],
    quotations = [],
    ledgerEntries = [],
    treasuryMovements = [],
    refunds = [],
    startDate = '',
    endDate = '',
  } = input;
  const inPeriod = (iso) => {
    const d = day(iso);
    return Boolean(d) && (!startDate || d >= startDate) && (!endDate || d <= endDate);
  };
  const onOrBeforeEnd = (iso) => {
    const d = day(iso);
    return Boolean(d) && (!endDate || d <= endDate);
  };

  const baseRows = salesPaymentsReceivedRows(
    receipts,
    productionJobs,
    quotations,
    startDate,
    endDate,
    ledgerEntries,
    treasuryMovements,
    refunds
  );
  const reportCashRows = baseRows.filter((r) => r.group !== SALES_REPORT_GROUP_OUTSTANDING);
  const debtorRows = baseRows.filter((r) => r.group === SALES_REPORT_GROUP_OUTSTANDING);

  const receiptByLedgerId = new Map();
  for (const r of receipts) {
    const key = String(r.ledgerEntryId || r.id || '').trim();
    if (key && !receiptByLedgerId.has(key)) receiptByLedgerId.set(key, r);
  }
  const receiptLinesByLedgerId = new Map();
  for (const t of treasuryMovements) {
    if (String(t.sourceKind || '') !== 'LEDGER_RECEIPT') continue;
    if (t.type !== 'RECEIPT_IN' && t.type !== 'RECEIPT_REVERSAL_OUT') continue;
    const id = String(t.sourceId || '').trim();
    if (!id) continue;
    const list = receiptLinesByLedgerId.get(id) || [];
    list.push(t);
    receiptLinesByLedgerId.set(id, list);
  }

  // --- (1) Cash received in period, from treasury ---------------------------------------------
  const cashLines = treasuryMovements.filter(
    (t) => SALES_CASH_TREASURY_TYPES.includes(t.type) && inPeriod(t.postedAtISO)
  );
  const accountMap = new Map();
  for (const t of cashLines) {
    const key = String(t.treasuryAccountId ?? t.accountName ?? '');
    const acc = accountMap.get(key) || {
      treasuryAccountId: t.treasuryAccountId,
      accountName: t.accountName || '',
      label: treasuryAccountLabel(t),
      displayName:
        String(t.accountType || '').trim().toLowerCase() === 'cash'
          ? String(t.accountName || 'Cash').trim()
          : String(t.bankName || t.accountName || '').trim(),
      receiptsInNgn: 0,
      advancesInNgn: 0,
      reversalsOutNgn: 0,
      amountNgn: 0,
    };
    const amt = ngn(t.amountNgn);
    if (t.type === 'RECEIPT_IN') acc.receiptsInNgn += amt;
    else if (t.type === 'ADVANCE_IN') acc.advancesInNgn += amt;
    else acc.reversalsOutNgn += amt;
    acc.amountNgn += amt;
    accountMap.set(key, acc);
  }
  const cashByAccount = [...accountMap.values()].sort((a, b) => b.amountNgn - a.amountNgn);
  const cashReceived = {
    totalNgn: sumBy(cashLines, 'amountNgn'),
    receiptsInNgn: sumBy(cashLines.filter((t) => t.type === 'RECEIPT_IN'), 'amountNgn'),
    advancesInNgn: sumBy(cashLines.filter((t) => t.type === 'ADVANCE_IN'), 'amountNgn'),
    reversalsOutNgn: sumBy(cashLines.filter((t) => t.type === 'RECEIPT_REVERSAL_OUT'), 'amountNgn'),
    byAccount: cashByAccount,
  };

  // --- (2) Recognised sales -------------------------------------------------------------------
  const factsFor = (ledgerId) => {
    const lines = receiptLinesByLedgerId.get(ledgerId) || [];
    const ins = lines.filter((t) => t.type === 'RECEIPT_IN');
    const inToEnd = sumBy(ins.filter((t) => onOrBeforeEnd(t.postedAtISO)), 'amountNgn');
    const revToEnd = sumBy(
      lines.filter((t) => t.type === 'RECEIPT_REVERSAL_OUT' && onOrBeforeEnd(t.postedAtISO)),
      'amountNgn'
    );
    const periodLines = lines.filter((t) => inPeriod(t.postedAtISO));
    const postedAccounts = [...new Set(ins.map((t) => String(t.accountName || '').trim()).filter(Boolean))];
    return {
      lines,
      hasAnyLine: ins.length > 0,
      fullyReversedByEnd: inToEnd > 0 && inToEnd + revToEnd <= 0,
      netInPeriodNgn: sumBy(periodLines, 'amountNgn'),
      hasPeriodLine: periodLines.length > 0,
      otherDates: [...new Set(ins.filter((t) => !inPeriod(t.postedAtISO)).map((t) => day(t.postedAtISO)))].sort(),
      bankLabel: [...new Set(ins.map(treasuryAccountLabel))].join(' + '),
      postedAccounts,
    };
  };
  const factsCache = new Map();
  const facts = (id) => {
    if (!factsCache.has(id)) factsCache.set(id, factsFor(id));
    return factsCache.get(id);
  };

  const recognisedRows = [];
  const excludedReversedRows = [];
  for (const r of reportCashRows) {
    const ledgerId = String(r.ledgerEntryId || r.receiptId || '').trim();
    const f = facts(ledgerId);
    const receipt = receiptByLedgerId.get(ledgerId) || null;
    const status = String(receipt?.status || '').trim();
    const row = {
      ...r,
      receiptStatus: status,
      suspended: isSuspendedReceiptStatus(status),
      bankLabel: f.bankLabel || '',
      bankNote: receiptMethodVersusTreasuryNote(r.paymentMethod || receipt?.method, f.postedAccounts),
      treasuryInPeriodNgn: f.netInPeriodNgn,
    };
    if (f.fullyReversedByEnd) excludedReversedRows.push(row);
    else recognisedRows.push(row);
  }

  const recognised = {
    totalNgn: sumBy(recognisedRows, 'amountPaidNgn'),
    producedNgn: sumBy(recognisedRows.filter((r) => r.group === SALES_REPORT_GROUP_PRODUCED), 'amountPaidNgn'),
    notProducedNgn: sumBy(recognisedRows.filter((r) => r.group === SALES_REPORT_GROUP_NOT_PRODUCED), 'amountPaidNgn'),
    suspendedKeptNgn: sumBy(recognisedRows.filter((r) => r.suspended), 'amountPaidNgn'),
    suspendedKeptCount: recognisedRows.filter((r) => r.suspended).length,
    excludedReversedNgn: sumBy(excludedReversedRows, 'amountPaidNgn'),
    excludedReversedRows,
    reportRowsTotalNgn: sumBy(reportCashRows, 'amountPaidNgn'),
  };

  // --- Reconciliation: recognised sales → cash received -------------------------------------------
  const byLedgerId = new Map();
  for (const r of recognisedRows) {
    const id = String(r.ledgerEntryId || r.receiptId || '').trim();
    const g = byLedgerId.get(id) || { ledgerEntryId: id, rows: [], amountNgn: 0 };
    g.rows.push(r);
    g.amountNgn += ngn(r.amountPaidNgn);
    byLedgerId.set(id, g);
  }
  const reconItems = {
    [SALES_RECON_RECEIVED_BEFORE_PERIOD]: [],
    [SALES_RECON_NO_TREASURY_IN_PERIOD]: [],
    [SALES_RECON_AMOUNT_DIFFERS]: [],
    [SALES_RECON_TREASURY_NOT_IN_SALES]: [],
    [SALES_RECON_ADVANCES]: [],
    [SALES_RECON_OTHER_TREASURY]: [],
  };
  const exceptions = [];
  const describe = (g) => {
    const first = g.rows[0];
    return {
      ledgerEntryId: g.ledgerEntryId,
      receiptId: first.receiptId || '',
      customerName: first.customerName || '',
      quotationRef: first.quotationRef || '',
      paymentDateISO: first.paymentDateISO || '',
      receiptAmountNgn: g.amountNgn,
    };
  };
  for (const g of byLedgerId.values()) {
    const f = facts(g.ledgerEntryId);
    const diff = f.netInPeriodNgn - g.amountNgn;
    const paidBeforePeriod = g.rows.every((r) => startDate && day(r.paymentDateISO) < startDate);
    const base = { ...describe(g), treasuryInPeriodNgn: f.netInPeriodNgn, amountNgn: diff };
    if (paidBeforePeriod) {
      if (diff) reconItems[SALES_RECON_RECEIVED_BEFORE_PERIOD].push(base);
      continue;
    }
    if (!diff) continue;
    if (!f.hasPeriodLine) {
      reconItems[SALES_RECON_NO_TREASURY_IN_PERIOD].push(base);
      exceptions.push({
        ...base,
        kind: f.hasAnyLine ? SALES_EXCEPTION_NO_TREASURY_IN_PERIOD : SALES_EXCEPTION_NO_TREASURY,
        note: f.otherDates.length ? `Treasury posted ${f.otherDates.join(', ')}` : 'No treasury line found',
      });
    } else {
      reconItems[SALES_RECON_AMOUNT_DIFFERS].push(base);
      exceptions.push({
        ...base,
        kind: SALES_EXCEPTION_AMOUNT_DIFFERS,
        note: f.otherDates.length ? `Other treasury lines ${f.otherDates.join(', ')}` : '',
      });
    }
  }

  const notInSales = new Map();
  for (const t of cashLines) {
    if (t.type === 'ADVANCE_IN') {
      reconItems[SALES_RECON_ADVANCES].push({
        treasuryMovementId: t.id,
        ledgerEntryId: String(t.sourceId || ''),
        customerName: t.counterpartyName || '',
        paymentDateISO: day(t.postedAtISO),
        amountNgn: ngn(t.amountNgn),
      });
      continue;
    }
    const id = String(t.sourceId || '').trim();
    if (String(t.sourceKind || '') !== 'LEDGER_RECEIPT' || !id) {
      reconItems[SALES_RECON_OTHER_TREASURY].push({
        treasuryMovementId: t.id,
        ledgerEntryId: id,
        customerName: t.counterpartyName || '',
        paymentDateISO: day(t.postedAtISO),
        amountNgn: ngn(t.amountNgn),
        note: `${t.type} · ${t.sourceKind || 'no source'}`,
      });
      continue;
    }
    if (byLedgerId.has(id)) continue;
    const item = notInSales.get(id) || {
      ledgerEntryId: id,
      customerName: t.counterpartyName || '',
      paymentDateISO: day(t.postedAtISO),
      amountNgn: 0,
      lineCount: 0,
    };
    item.amountNgn += ngn(t.amountNgn);
    item.lineCount += 1;
    notInSales.set(id, item);
  }
  for (const item of notInSales.values()) {
    if (!item.amountNgn) continue; // receipt and its reversal both in the period: nets to nil
    const receipt = receiptByLedgerId.get(item.ledgerEntryId);
    let note = 'No sales receipt for this ledger entry';
    if (receipt) {
      const rd = day(receipt.dateISO);
      if (rd && !inPeriod(rd)) note = `Receipt dated ${rd} (outside the period)`;
      else note = `Receipt ${String(receipt.status || '').trim() || 'on file'}; quotation not recognised this period`;
      item.customerName = receipt.customer || item.customerName;
      item.quotationRef = receipt.quotationRef || '';
    }
    reconItems[SALES_RECON_TREASURY_NOT_IN_SALES].push({ ...item, note });
  }
  for (const list of Object.values(reconItems)) {
    list.sort((a, b) => Math.abs(b.amountNgn) - Math.abs(a.amountNgn) || String(a.ledgerEntryId).localeCompare(String(b.ledgerEntryId)));
  }

  const reconLines = Object.entries(reconItems).map(([key, items]) => ({
    key,
    label: RECON_LABELS[key],
    amountNgn: sumBy(items, 'amountNgn'),
    items,
  }));
  const explainedNgn = recognised.totalNgn + reconLines.reduce((s, l) => s + l.amountNgn, 0);
  const reconciliation = {
    startLabel: 'Recognised sales (produced in period)',
    startNgn: recognised.totalNgn,
    lines: reconLines,
    endLabel: 'Cash received in period (treasury)',
    endNgn: cashReceived.totalNgn,
    unexplainedNgn: cashReceived.totalNgn - explainedNgn,
  };

  exceptions.sort((a, b) => String(a.paymentDateISO).localeCompare(String(b.paymentDateISO)) || String(a.ledgerEntryId).localeCompare(String(b.ledgerEntryId)));

  const accrual = buildSalesAccrual({
    quotations,
    quotationLines: input.quotationLines,
    productionJobs,
    ledgerEntries,
    treasuryMovements: input.accrualTreasuryMovements || treasuryMovements,
    refunds,
    bankRecon: input.bankRecon || input.bankReconciliation || [],
    startDate,
    endDate,
  });

  return {
    startDate,
    endDate,
    accrual,
    // Balances need treasury before the period; the period-source loader only sends it as accrualTreasuryMovements.
    accrualHasFullHistory:
      Boolean(input.accrualTreasuryMovements) ||
      treasuryMovements.some((t) => startDate && day(t.postedAtISO) < startDate),
    cashReceived,
    recognised,
    rows: [...recognisedRows, ...debtorRows],
    recognisedRows,
    debtorRows,
    reconciliation,
    exceptions,
    bankMismatchCount: recognisedRows.filter((r) => r.bankNote).length,
  };
}
