/** Shared expense / payment request line-item helpers (Accounts + Office Desk). */

export function createExpenseRequestLineItem() {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item: '',
    unit: '',
    unitPriceNgn: '',
  };
}

export function expenseRequestLineTotal(row) {
  const u = Number(row.unit);
  const p = Number(row.unitPriceNgn);
  if (!u || Number.isNaN(p)) return 0;
  return Math.round(u * p);
}

export function initialExpenseRequestFormState() {
  return {
    lines: [createExpenseRequestLineItem()],
    requestDate: new Date().toISOString().slice(0, 10),
    requestReference: '',
    expenseCategory: '',
    categoryJustification: '',
    description: '',
    payeeName: '',
    payeeAccountNo: '',
    payeeBankName: '',
    attachment: null,
  };
}

/**
 * Prefill the shared expense-request form from an existing payment request
 * (e.g. rejected archive → resubmit for Branch Manager approval).
 * @param {object | null | undefined} req
 * @param {{ todayIso?: string }} [opts]
 */
export function expenseRequestFormFromPaymentRequest(req, opts = {}) {
  const todayIso = String(opts.todayIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const base = initialExpenseRequestFormState();
  if (!req) return { ...base, requestDate: todayIso };

  const rawLines = Array.isArray(req.lineItems)
    ? req.lineItems
    : Array.isArray(req.line_items)
      ? req.line_items
      : [];
  const amountNgn = Number(req.amountRequestedNgn ?? req.amount_requested_ngn) || 0;
  const description = String(req.description || '').trim() || '—';
  const lines =
    rawLines.length > 0
      ? rawLines.map((ln, idx) => ({
          id: `li-prefill-${idx + 1}`,
          item: String(ln?.item || '').trim(),
          unit: String(ln?.unit ?? ''),
          unitPriceNgn: String(ln?.unitPriceNgn ?? ln?.unit_price_ngn ?? ''),
        }))
      : [
          {
            ...createExpenseRequestLineItem(),
            item: description === '—' ? 'Expense' : description.slice(0, 200),
            unit: '1',
            unitPriceNgn: amountNgn > 0 ? String(amountNgn) : '',
          },
        ];

  return {
    ...base,
    lines,
    requestDate: String(req.requestDate || req.request_date || todayIso).slice(0, 10) || todayIso,
    requestReference: String(
      req.requestReference || req.request_reference || req.requestID || req.request_id || ''
    ).trim(),
    expenseCategory: String(req.expenseCategory || req.expense_category || '').trim(),
    categoryJustification: String(req.categoryJustification || req.category_justification || '').trim(),
    description,
    payeeName: String(req.payeeName || req.payee_name || '').trim(),
    payeeAccountNo: String(req.payeeAccountNo || req.payee_account_no || '').trim(),
    payeeBankName: String(req.payeeBankName || req.payee_bank_name || '').trim(),
    attachment: null,
  };
}

/**
 * @param {object} requestForm
 * @returns {object} body for POST /api/payment-requests or office convert
 */
export function buildPaymentRequestBodyFromForm(requestForm) {
  const expenseCategory = String(requestForm.expenseCategory || '').trim();
  const lineItems = requestForm.lines
    .map((row) => {
      const item = String(row.item || '').trim();
      const unit = Number.parseFloat(String(row.unit ?? '').replace(/,/g, ''));
      const unitPriceNgn = Number(row.unitPriceNgn);
      return { item, unit, unitPriceNgn };
    })
    .filter((r) => r.item && r.unit > 0 && Number.isFinite(r.unitPriceNgn) && r.unitPriceNgn >= 0);
  const requestDate = requestForm.requestDate || new Date().toISOString().slice(0, 10);
  const description = String(requestForm.description || '').trim() || '—';
  const requestReference = String(requestForm.requestReference || '').trim();
  const body = {
    requestDate,
    description,
    requestReference,
    expenseCategory,
    categoryJustification: String(requestForm.categoryJustification || '').trim(),
    payeeName: String(requestForm.payeeName || '').trim(),
    payeeAccountNo: String(requestForm.payeeAccountNo || '').trim(),
    payeeBankName: String(requestForm.payeeBankName || '').trim(),
    lineItems,
  };
  if (requestForm.attachment?.dataBase64) {
    body.attachment = {
      name: requestForm.attachment.name,
      mime: requestForm.attachment.mime,
      dataBase64: requestForm.attachment.dataBase64,
    };
  }
  return body;
}

export function normalizeExpensePayeeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Soft near-duplicate: same payee + amount + request day among open/recent requests.
 * Does not block submit — callers should warn only.
 * @param {{
 *   paymentRequests?: object[];
 *   payeeName?: string;
 *   amountNgn?: number;
 *   requestDate?: string;
 *   excludeRequestId?: string;
 * }} opts
 * @returns {object | null}
 */
export function findNearDuplicatePaymentRequest({
  paymentRequests = [],
  payeeName = '',
  amountNgn = 0,
  requestDate = '',
  excludeRequestId = '',
} = {}) {
  const payee = normalizeExpensePayeeKey(payeeName);
  const amount = Math.round(Number(amountNgn) || 0);
  const day = String(requestDate || '').slice(0, 10);
  if (!payee || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const exclude = String(excludeRequestId || '').trim();
  for (const pr of paymentRequests || []) {
    const status = String(pr?.status || '').trim().toLowerCase();
    if (status === 'rejected' || status === 'cancelled' || status === 'canceled') continue;

    const id = String(pr?.requestID || pr?.request_id || pr?.id || '').trim();
    if (exclude && id && id === exclude) continue;

    const prPayee = normalizeExpensePayeeKey(pr?.payeeName || pr?.payee_name);
    const prAmount = Math.round(
      Number(pr?.amountRequestedNgn ?? pr?.amount_requested_ngn ?? pr?.amountNgn ?? pr?.amount) || 0
    );
    const prDay = String(
      pr?.requestDate || pr?.request_date || pr?.createdAtISO || pr?.created_at || ''
    ).slice(0, 10);
    if (prPayee === payee && prAmount === amount && prDay === day) return pr;
  }
  return null;
}
