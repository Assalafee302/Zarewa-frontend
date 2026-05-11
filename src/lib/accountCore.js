export const ACCOUNT_TAB_LABELS = {
  treasury: 'Treasury',
  receipts: 'Receipts & bank recon',
  cashier: 'Cashier confirmation',
  movements: 'Fund movements',
  disbursements: 'Payments',
  audit: 'Audit & reconciliation',
};

export const TREASURY_STATEMENT_TYPE_LABEL = {
  RECEIPT_IN: 'Customer receipt',
  ADVANCE_IN: 'Advance deposit',
  BANK_RECON_ADJUSTMENT: 'Bank reconciliation settlement',
  INTERNAL_TRANSFER_IN: 'Transfer in',
  INTERNAL_TRANSFER_OUT: 'Transfer out',
  EXPENSE: 'Expense',
  AP_PAYMENT: 'Accounts payable payment',
  SUPPLIER_PAYMENT: 'Supplier payment',
  PO_SUPPLIER_PAYMENT: 'Supplier payment',
  REFUND_PAYOUT: 'Customer refund payout',
  REFUND_PAYOUT_REVERSAL_IN: 'Customer refund payout (reversal)',
  ADVANCE_REFUND_OUT: 'Advance refund',
  PAYMENT_REQUEST_OUT: 'Payment request payout',
  TRANSPORT_PAYMENT: 'Transport / haulage',
};

export const TREASURY_SOURCE_KIND_LABEL = {
  INTER_BRANCH_LOAN: 'Inter-branch lending (disbursement)',
  INTER_BRANCH_LOAN_REPAY: 'Inter-branch lending (repayment)',
  /** Sales quotation receipt — same rows appear under Sales → Receipt payments when posted live. */
  LEDGER_RECEIPT: 'Customer receipt (Sales)',
  /** Advance deposit hitting the bank — listed under Sales → Advance deposits until linked/applied. */
  LEDGER_ADVANCE: 'Advance deposit (not a quotation receipt)',
  LEDGER_ADVANCE_REFUND: 'Advance refund payout',
  BANK_RECON_LINE: 'Bank reconciliation settlement',
  EXPENSE: 'Posted expense (direct debit)',
  PAYMENT_REQUEST: 'Expense payment request (payout)',
};

/**
 * Treasury lines for a posted direct expense (negative outflow).
 * @param {string} expenseId
 * @param {Array<{ id?: string, type?: string, sourceKind?: string, sourceId?: string, reversesMovementId?: string }>} movements
 */
export function treasuryOutflowLinesForExpense(expenseId, movements) {
  const eid = String(expenseId || '').trim();
  if (!eid || !Array.isArray(movements)) return [];
  return movements.filter(
    (m) =>
      String(m.type || '') === 'EXPENSE' &&
      String(m.sourceKind || '') === 'EXPENSE' &&
      String(m.sourceId || '').trim() === eid &&
      !m.reversesMovementId
  );
}

/**
 * Treasury payout lines for an expense payment request (negative outflow).
 * @param {string} requestId
 * @param {Array<{ id?: string, type?: string, sourceKind?: string, sourceId?: string, reversesMovementId?: string }>} movements
 */
export function treasuryOutflowLinesForPaymentRequest(requestId, movements) {
  const rid = String(requestId || '').trim();
  if (!rid || !Array.isArray(movements)) return [];
  return movements.filter(
    (m) =>
      String(m.type || '') === 'PAYMENT_REQUEST_OUT' &&
      String(m.sourceKind || '') === 'PAYMENT_REQUEST' &&
      String(m.sourceId || '').trim() === rid &&
      !m.reversesMovementId
  );
}

/**
 * Treasury payout lines for a customer refund (negative outflow per bank/cash leg).
 * @param {string} refundId
 * @param {Array<{ id?: string, type?: string, sourceKind?: string, sourceId?: string, reversesMovementId?: string }>} movements
 */
export function treasuryOutflowLinesForRefund(refundId, movements) {
  const fid = String(refundId || '').trim();
  if (!fid || !Array.isArray(movements)) return [];
  return movements.filter(
    (m) =>
      String(m.type || '') === 'REFUND_PAYOUT' &&
      String(m.sourceKind || '') === 'REFUND' &&
      String(m.sourceId || '').trim() === fid &&
      !m.reversesMovementId
  );
}

/** Treasury movement types shown on Finance → Payments (money leaving the business). */
export const TREASURY_PAYMENTS_TABLE_OUTFLOW_TYPES = new Set([
  'EXPENSE',
  'AP_PAYMENT',
  'SUPPLIER_PAYMENT',
  'PO_SUPPLIER_PAYMENT',
  'REFUND_PAYOUT',
  'ADVANCE_REFUND_OUT',
  'PAYMENT_REQUEST_OUT',
  'TRANSPORT_PAYMENT',
  'RECEIPT_REVERSAL_OUT',
  'ADVANCE_REVERSAL_OUT',
]);

/**
 * Whether a movement row is a primary (non-reversal) treasury debit for the Payments register.
 * @param {{ type?: string, sourceKind?: string, amountNgn?: number, reversesMovementId?: string }} m
 */
export function isTreasuryOutflowPaymentRow(m) {
  if (!m || m.reversesMovementId) return false;
  const t = String(m.type || '');
  if (!TREASURY_PAYMENTS_TABLE_OUTFLOW_TYPES.has(t)) return false;
  const amt = Number(m.amountNgn) || 0;
  return amt < 0;
}

/**
 * Rows for the unified Payments table (posted treasury outflows).
 * @param {Array<object>} movements workspace treasuryMovements
 */
export function treasuryOutflowPaymentTableRows(movements) {
  if (!Array.isArray(movements)) return [];
  return movements.filter(isTreasuryOutflowPaymentRow).map((m) => ({
    movementId: String(m.id || ''),
    postedAtISO: String(m.postedAtISO || ''),
    type: String(m.type || ''),
    sourceKind: String(m.sourceKind || ''),
    sourceId: String(m.sourceId || '').trim(),
    description: treasuryMovementStatementLabel(m),
    accountName: String(m.accountName || '').trim(),
    amountAbs: Math.abs(Number(m.amountNgn) || 0),
    reference: String(m.reference || '').trim(),
    counterpartyName: String(m.counterpartyName || '').trim(),
  }));
}

export const nextExpenseId = (list) => {
  const nums = list
    .map((e) => {
      const raw = String(e?.expenseID || '');
      const m = raw.match(/-(\d+)$/);
      return Number.parseInt(m?.[1] || '', 10);
    })
    .filter((n) => !Number.isNaN(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `EXP-2026-${String(n).padStart(3, '0')}`;
};

export const normalizePaymentRequest = (row) => ({
  ...row,
  paidAmountNgn: Number(row?.paidAmountNgn) || 0,
  paidAtISO: row?.paidAtISO || '',
  paidBy: row?.paidBy || '',
  paymentNote: row?.paymentNote || '',
  branchId: row?.branchId || '',
  expenseCategory: row?.expenseCategory || '',
  isStaffLoan: Boolean(row?.isStaffLoan),
  hrRequestId: row?.hrRequestId || '',
  staffUserId: row?.staffUserId || '',
  staffDisplayName: row?.staffDisplayName || '',
  requestReference: row?.requestReference || '',
  lineItems: Array.isArray(row?.lineItems) ? row.lineItems : [],
  attachmentName: row?.attachmentName || '',
  attachmentMime: row?.attachmentMime || '',
  attachmentPresent: Boolean(row?.attachmentPresent),
});

export const createRequestPayLine = (defaultAccountId = '', amount = '') => ({
  id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  treasuryAccountId: String(defaultAccountId),
  amount: amount === '' ? '' : String(amount),
  reference: '',
});

export function treasuryMovementStatementLabel(m) {
  const sourceLabel = TREASURY_SOURCE_KIND_LABEL[m.sourceKind];
  const kind = sourceLabel || TREASURY_STATEMENT_TYPE_LABEL[m.type] || m.type || 'Treasury movement';
  const bits = [kind];
  if (m.counterpartyName) bits.push(m.counterpartyName);
  if (m.reference) bits.push(`Ref ${m.reference}`);
  if (m.note) bits.push(m.note);
  return bits.join(' · ');
}

/**
 * Compact badge for Finance account statements so users can tell Sales receipts from advances and other flows.
 * @returns {{ label: string, className: string }}
 */
export function treasuryMovementSourceBadge(m) {
  if (!m || typeof m !== 'object') return { label: '—', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80' };
  const sk = String(m.sourceKind || '');
  const tp = String(m.type || '');
  if (sk === 'LEDGER_RECEIPT') {
    return { label: 'Sales receipt', className: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80' };
  }
  if (sk === 'LEDGER_ADVANCE') {
    return { label: 'Advance', className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80' };
  }
  if (sk === 'LEDGER_ADVANCE_REFUND') {
    return { label: 'Adv refund', className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80' };
  }
  if (sk === 'BANK_RECON_LINE') {
    return { label: 'Bank recon', className: 'bg-sky-100 text-sky-900 ring-1 ring-sky-200/70' };
  }
  if (sk === 'EXPENSE' || tp === 'EXPENSE') {
    return { label: 'Expense', className: 'bg-rose-50 text-rose-900 ring-1 ring-rose-100' };
  }
  if (sk === 'TREASURY_TRANSFER' || tp === 'INTERNAL_TRANSFER_IN' || tp === 'INTERNAL_TRANSFER_OUT') {
    return { label: 'Transfer', className: 'bg-violet-100 text-violet-900 ring-1 ring-violet-200/70' };
  }
  if (sk === 'REFUND' || tp === 'REFUND_PAYOUT') {
    return { label: 'Refund', className: 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/70' };
  }
  if (sk === 'PAYMENT_REQUEST') {
    return { label: 'Payment req', className: 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/70' };
  }
  const fallback = TREASURY_STATEMENT_TYPE_LABEL[tp] || tp || 'Other';
  const short =
    fallback.length > 14 ? `${fallback.slice(0, 12).trim()}…` : fallback;
  return { label: short, className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80' };
}

export function buildPaymentRequestAuditTrail(req) {
  if (!req || typeof req !== 'object') return [];
  const trail = [];
  if (req.requestDate || req.requestedBy) {
    trail.push({
      key: 'requested',
      label: 'Requested',
      who: req.requestedBy || '—',
      at: req.requestDate || req.createdAtISO || '',
    });
  }
  if (req.approvedBy || req.approvedAtISO) {
    trail.push({
      key: 'approved',
      label: 'Approved',
      who: req.approvedBy || '—',
      at: req.approvedAtISO || '',
    });
  }
  if (req.paidBy || req.paidAtISO) {
    trail.push({
      key: 'paid',
      label: 'Paid',
      who: req.paidBy || '—',
      at: req.paidAtISO || '',
    });
  }
  return trail;
}

