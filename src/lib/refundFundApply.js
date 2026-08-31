/**
 * Refund fund: leftover overpay / eligible refund applied onto a new quotation.
 * Ledger bankReference prefix matches backend CREDIT_APPLY: (see refundCreditApplyOps).
 */

export const REFUND_FUND_LEDGER_REF_PREFIX = 'CREDIT_APPLY:';
export const REFUND_FUND_USE_LABEL = 'Use from refund fund';
export const REFUND_FUND_DEDUCTED_LABEL = 'Deducted from refund fund';
export const REFUND_FUND_CASHIER_OFFSET_LABEL = 'Use overpay / refund fund on this receipt';

export function refundCreditApplicationIsActive(app) {
  const s = String(app?.status || '').trim().toLowerCase();
  return s !== 'reversed' && s !== 'cancelled';
}

function roundNgn(n) {
  return Math.max(0, Math.round(Number(n) || 0));
}

/**
 * Cashier confirm: take refund fund off unconfirmed receipt cash; leftover refund stays for payout.
 * @param {{ receiptCashNgn?: number, availableNgn?: number }} p
 */
export function planCashierRefundOffset({ receiptCashNgn, availableNgn }) {
  const receipt = roundNgn(receiptCashNgn);
  const available = roundNgn(availableNgn);
  const offsetNgn = Math.min(receipt, available);
  return {
    offsetNgn,
    cashToConfirmNgn: Math.max(0, receipt - offsetNgn),
    leftoverRefundNgn: Math.max(0, available - offsetNgn),
  };
}

/** Tick every usable source. Skip same-quote overpay on confirm so this receipt’s own extra cash is not offset against itself. */
export function defaultRefundSourceSelection(sources) {
  const list = Array.isArray(sources) ? sources : [];
  return list
    .filter((s) => !(s.kind === 'overpay' && s.sameQuotation))
    .map((s) => String(s.id || '').trim())
    .filter(Boolean);
}

export function sumRefundSourceAvailableNgn(sources, selectedIds) {
  const ids = new Set(Array.isArray(selectedIds) ? selectedIds.map((id) => String(id || '').trim()) : []);
  return (Array.isArray(sources) ? sources : [])
    .filter((s) => ids.has(String(s.id || '').trim()))
    .reduce((sum, s) => sum + roundNgn(s.availableNgn), 0);
}

export function parsePaymentLineAmount(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * @param {{ type?: string, bankReference?: string, bank_reference?: string, note?: string } | null | undefined} entry
 */
export function isRefundFundApplyLedgerEntry(entry) {
  if (String(entry?.type || '').trim() !== 'OVERPAY_APPLIED') return false;
  const ref = String(entry?.bankReference || entry?.bank_reference || '').trim();
  if (ref.startsWith(REFUND_FUND_LEDGER_REF_PREFIX)) return true;
  return /credit confirmation/i.test(String(entry?.note || ''));
}

function applicationTargetRef(row) {
  return String(row?.targetQuotationRef || row?.target_quotation_ref || '').trim();
}

function emptyApplied(quotationRef = '') {
  return {
    quotationRef: String(quotationRef || '').trim(),
    appliedNgn: 0,
    sources: [],
    detailLabel: '',
    origin: null,
  };
}

function pushSource(row, source) {
  const amt = roundNgn(source.amountNgn);
  if (amt <= 0) return;
  row.appliedNgn += amt;
  row.sources.push({ ...source, amountNgn: amt });
}

function finishAppliedRow(row) {
  row.detailLabel = row.sources
    .map((s) => {
      if (s.refundId) {
        return s.sourceQuotationRef ? `${s.refundId} (${s.sourceQuotationRef})` : String(s.refundId);
      }
      if (s.sourceQuotationRef) return String(s.sourceQuotationRef);
      return String(s.note || '').trim();
    })
    .filter(Boolean)
    .join('; ');
  return row;
}

/**
 * Refund-fund amounts already applied onto quotations (not bank clearance).
 * Prefers explicit applications, then CREDIT_APPLY ledger rows, then refund creditApplied fields.
 *
 * @param {{
 *   ledgerEntries?: object[],
 *   refunds?: object[],
 *   applications?: object[],
 * }} [opts]
 * @returns {Map<string, ReturnType<typeof emptyApplied>>}
 */
export function refundFundAppliedByQuotationRef({
  ledgerEntries = [],
  refunds = [],
  applications = [],
} = {}) {
  /** @type {Map<string, ReturnType<typeof emptyApplied>>} */
  const map = new Map();

  const ensure = (qid) => {
    const id = String(qid || '').trim();
    if (!id) return null;
    if (!map.has(id)) map.set(id, emptyApplied(id));
    return map.get(id);
  };

  for (const a of applications || []) {
    if (!refundCreditApplicationIsActive(a)) continue;
    const row = ensure(applicationTargetRef(a));
    if (!row) continue;
    row.origin = 'applications';
    pushSource(row, {
      kind: a.kind || 'application',
      refundId: a.refundId || a.refund_id || null,
      sourceQuotationRef: a.sourceQuotationRef || a.source_quotation_ref || '',
      amountNgn: a.amountNgn ?? a.amount_ngn,
    });
  }

  for (const e of ledgerEntries || []) {
    if (!isRefundFundApplyLedgerEntry(e)) continue;
    const row = ensure(e.quotationRef || e.quotation_ref);
    if (!row) continue;
    if (row.origin === 'applications') continue;
    row.origin = 'ledger';
    pushSource(row, {
      kind: 'ledger',
      refundId: null,
      sourceQuotationRef: '',
      amountNgn: e.amountNgn,
      note: e.note || e.bankReference || e.bank_reference || '',
    });
  }

  for (const r of refunds || []) {
    const dest = String(r.creditAppliedToQuotationRef || r.credit_applied_to_quotation_ref || '').trim();
    const amt = roundNgn(r.creditAppliedNgn ?? r.credit_applied_ngn);
    if (!dest || amt <= 0) continue;
    const row = ensure(dest);
    if (!row) continue;
    if (row.origin === 'applications' || row.origin === 'ledger') continue;
    row.origin = 'refunds';
    pushSource(row, {
      kind: 'refund',
      refundId: r.refundID || r.refund_id || null,
      sourceQuotationRef: r.quotationRef || r.quotation_ref || '',
      amountNgn: amt,
    });
  }

  for (const [id, row] of map) {
    finishAppliedRow(row);
    if (!(row.appliedNgn > 0)) map.delete(id);
  }
  return map;
}

/**
 * Receipt-shaped rows so cutting list / printouts show refund-fund payments (no sales_receipt is posted).
 * @param {{ quotationRef?: string, ledgerEntries?: object[], applications?: object[] }} opts
 */
export function refundFundPaymentRowsForQuotation({
  quotationRef,
  ledgerEntries = [],
  applications = [],
} = {}) {
  const qid = String(quotationRef || '').trim();
  if (!qid) return [];
  const rows = [];
  const apps = (applications || []).filter((a) => applicationTargetRef(a) === qid);
  if (apps.length) {
    for (const a of apps) {
      const amt = roundNgn(a.amountNgn ?? a.amount_ngn);
      if (!(amt > 0)) continue;
      const iso = String(a.createdAtISO || a.created_at_iso || '').slice(0, 10);
      const id = String(a.applicationId || a.application_id || a.ledgerBankReference || a.ledger_bank_reference || '').trim();
      rows.push({
        id: id || `RFUND-${qid}-${iso || rows.length}`,
        quotationRef: qid,
        dateISO: iso,
        date: iso,
        amountNgn: amt,
        cashReceivedNgn: amt,
        method: REFUND_FUND_DEDUCTED_LABEL,
        paymentMethod: REFUND_FUND_DEDUCTED_LABEL,
        bankReference: REFUND_FUND_DEDUCTED_LABEL,
        _refundFund: true,
      });
    }
    return rows;
  }
  for (const e of ledgerEntries || []) {
    if (!isRefundFundApplyLedgerEntry(e)) continue;
    const ref = String(e.quotationRef || e.quotation_ref || '').trim();
    if (ref !== qid) continue;
    const amt = roundNgn(e.amountNgn ?? e.amount_ngn);
    if (!(amt > 0)) continue;
    const iso = String(e.atISO || e.at_iso || '').slice(0, 10);
    const id = String(e.id || e.bankReference || e.bank_reference || '').trim();
    rows.push({
      id: id || `RFUND-${qid}-${iso || rows.length}`,
      quotationRef: qid,
      dateISO: iso,
      date: iso,
      amountNgn: amt,
      cashReceivedNgn: amt,
      method: REFUND_FUND_DEDUCTED_LABEL,
      paymentMethod: REFUND_FUND_DEDUCTED_LABEL,
      bankReference: REFUND_FUND_DEDUCTED_LABEL,
      _refundFund: true,
    });
  }
  return rows;
}

/**
 * @param {{
 *   ledgerEntries?: object[],
 *   refunds?: object[],
 *   applications?: object[],
 *   quotationRef?: string,
 * }} opts
 */
export function refundFundAppliedOnQuotation(opts = {}) {
  const qid = String(opts.quotationRef || '').trim();
  if (!qid) return emptyApplied('');
  const map = refundFundAppliedByQuotationRef(opts);
  return map.get(qid) || emptyApplied(qid);
}

/**
 * After quote total is known, cash lines should equal remaining due (quote due − refund fund).
 * Empty lines or lines still holding a different total are rewritten; a smaller user-entered
 * remaining cash amount is left alone.
 *
 * @param {Array<{ amount?: string }>} lines
 * @param {number} cashDueNgn
 */
export function applyRefundFundDeductionToPaymentLines(lines, cashDueNgn) {
  const due = roundNgn(cashDueNgn);
  const rows = Array.isArray(lines) ? lines.map((l) => ({ ...l })) : [];
  if (!rows.length) return rows;
  if (due <= 0) {
    return rows.map((l) => ({ ...l, amount: '' }));
  }
  const total = rows.reduce((s, l) => s + parsePaymentLineAmount(l.amount), 0);
  if (total === due) return rows;
  if (rows.length === 1 || total === 0) {
    return rows.map((l, i) => (i === 0 ? { ...l, amount: String(due) } : { ...l, amount: '' }));
  }
  if (total > due) {
    let left = due;
    return rows.map((l) => {
      const amt = parsePaymentLineAmount(l.amount);
      if (amt <= 0 || left <= 0) return { ...l, amount: '' };
      const take = Math.min(amt, left);
      left -= take;
      return { ...l, amount: take > 0 ? String(take) : '' };
    });
  }
  return rows;
}

/**
 * Undo auto-deduct when staff uncheck refund fund, if lines still match the deducted cash due.
 *
 * @param {Array<{ amount?: string }>} lines
 * @param {number} fullDueNgn
 * @param {number} previousCashDueNgn
 */
export function restorePaymentLinesAfterRefundFundUnchecked(lines, fullDueNgn, previousCashDueNgn) {
  const fullDue = roundNgn(fullDueNgn);
  const prevCash = roundNgn(previousCashDueNgn);
  const rows = Array.isArray(lines) ? lines.map((l) => ({ ...l })) : [];
  if (!rows.length) return rows;
  const total = rows.reduce((s, l) => s + parsePaymentLineAmount(l.amount), 0);
  if (!(total === 0 || total === prevCash)) return rows;
  return rows.map((l, i) =>
    i === 0 ? { ...l, amount: fullDue > 0 ? String(fullDue) : '' } : { ...l, amount: '' }
  );
}

/**
 * Cashier confirm strip: refund-fund slice vs cash on this receipt.
 *
 * @param {{
 *   ledgerEntries?: object[],
 *   refunds?: object[],
 *   applications?: object[],
 *   quotationRef?: string,
 *   cashOnReceiptNgn?: number,
 *   quoteTotalNgn?: number | null,
 * }} opts
 */
export function buildRefundFundClearanceSummary(opts = {}) {
  const applied = refundFundAppliedOnQuotation(opts);
  if (!(applied.appliedNgn > 0)) return null;
  const cashOnReceiptNgn =
    opts.cashOnReceiptNgn == null ? null : roundNgn(opts.cashOnReceiptNgn);
  const quoteTotalNgn =
    opts.quoteTotalNgn == null || opts.quoteTotalNgn === ''
      ? null
      : roundNgn(opts.quoteTotalNgn);
  return {
    ...applied,
    cashOnReceiptNgn,
    quoteTotalNgn,
  };
}
