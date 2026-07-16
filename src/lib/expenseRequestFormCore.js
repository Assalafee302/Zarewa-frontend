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
