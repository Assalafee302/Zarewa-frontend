/**
 * Expenses report v2 (Reports Phase 1). Pure: expenses + payment requests + PO transport in → rows, ERP view,
 * reclassified ("book") view and exceptions out.
 *
 * - ERP view: every expense dated in the period (rejected payment requests left out, as before), by ERP category,
 *   with the payment request's real status (Paid / Part-paid / Pending payout / Cancelled / No payment request).
 * - Book view: the same lines after rule-based reclassification, matching the accountant's book. Every moved
 *   line is listed under the rule that moved it, so the reclassification is never redone by hand.
 *   Rules (first match wins, description = payment-request description or expense type):
 *     R1 Refund      "refund"                                → Refunds (not an expense)
 *     R2 Staff IOU   "IOU" / "10U", or a staff payee + loan/advance → Staff loans (not an expense)
 *     R3 Capital     transformer / NEMSA / generator / machine → Fixed asset (capital)
 *     R4 Accessories washer / felt outside Accessories        → Accessories
 *     R5 Forklift    forklift outside Maintenance             → Maintenance
 *     R6 Imprest     imprest (incl. misspellings "imprese", "impress") outside Admin expenses → Admin expenses
 *   Expenses whose payment request was cancelled are not expenses: left out of the book view and listed as
 *   exceptions (the ERP view still shows them, so its total matches the ERP).
 *   Carriage inward in the book = expense carriage + PO transport paid in the period − carriage expense lines that
 *   duplicate a PO transport payment (same amount, and the treasury line names the expense's payment request or
 *   was posted the same day).
 * - Payroll: Admin salary lines described as salary / wages are the payroll gross; anything else on Admin salary
 *   is flagged. An optional payroll split (factory / branch / HQ share) is shown and checked against the gross.
 */
import { filterExpensesInRange } from './liveAnalytics.js';
import { isCapexExpenseCategory } from '../shared/expenseCategories.js';

export const BOOK_REFUNDS = 'Refunds (not an expense)';
export const BOOK_STAFF_LOANS = 'Staff loans (not an expense)';
export const BOOK_FIXED_ASSET = 'Fixed asset (capital)';

/**
 * ERP categories that are not expenses in the book: lines already coded there (or recategorised there at source,
 * Phase 2) land in the same non-expense group the rules would move them to, so the book view does not change.
 */
export function bookGroupForErpCategory(category) {
  const c = String(category || '').trim();
  if (/^refund/i.test(c)) return BOOK_REFUNDS;
  if (/^staff loan/i.test(c)) return BOOK_STAFF_LOANS;
  if (isCapexExpenseCategory(c)) return BOOK_FIXED_ASSET;
  return c;
}

export const EXPENSE_RECLASS_RULES = [
  {
    id: 'R1',
    label: 'Refund coded as an expense',
    to: BOOK_REFUNDS,
    test: (e) => /\brefund/i.test(e.description) && bookGroupForErpCategory(e.category) !== BOOK_REFUNDS,
  },
  {
    id: 'R2',
    label: 'Staff IOU coded as an expense',
    to: BOOK_STAFF_LOANS,
    test: (e) =>
      !/^staff loan/i.test(e.category) &&
      (/\b(iou|10u)\b/i.test(e.description) || (Boolean(e.payeeStaff) && /\b(loan|advance)\b/i.test(e.description))),
  },
  {
    id: 'R3',
    label: 'Capital item coded as an expense',
    to: BOOK_FIXED_ASSET,
    test: (e) =>
      !/fuel/i.test(e.category) &&
      bookGroupForErpCategory(e.category) !== BOOK_FIXED_ASSET &&
      /transformer|\bnemsa\b|\bgenerator\b|\bmachine\b/i.test(e.description),
  },
  {
    id: 'R4',
    label: 'Accessories coded elsewhere',
    to: 'Accessories',
    test: (e) => !/^accessor/i.test(e.category) && /\bwashers?\b|\bfelt\b/i.test(e.description),
  },
  {
    id: 'R5',
    label: 'Forklift coded outside Maintenance',
    to: 'Maintenance',
    test: (e) => !/^maintenance/i.test(e.category) && /fork\s*lift|focklift/i.test(e.description),
  },
  {
    id: 'R6',
    label: 'Imprest coded outside Admin expenses',
    to: 'Admin expenses',
    test: (e) => !/^admin expenses/i.test(e.category) && /\bimpres\w*/i.test(e.description),
  },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const ngn = (v) => Math.round(num(v));
const day = (v) => String(v || '').slice(0, 10);
const sumBy = (list, key) => list.reduce((s, r) => s + ngn(r[key]), 0);

function requestStatus(req, amountNgn) {
  if (!req) return 'No payment request';
  const st = String(req.approvalStatus || '').trim();
  if (/^rejected/i.test(st)) return 'Rejected';
  if (/^cancel/i.test(st)) return 'Cancelled';
  const paid = num(req.paidAmountNgn);
  if (paid > 0 && paid >= amountNgn - 1) return 'Paid';
  if (paid > 0) return 'Part-paid';
  if (/^approved/i.test(st)) return 'Pending payout';
  return 'Pending approval';
}

/**
 * @param {object} input
 * @param {object[]} input.expenses
 * @param {object[]} input.paymentRequests
 * @param {object[]} [input.treasuryMovements] — PO transport payments (TRANSPORT_PAYMENT) in the period
 * @param {string} input.startDate
 * @param {string} input.endDate
 * @param {{ label: string, grossNgn: number }[]} [input.payrollSplit] — optional (HR payroll is not in the ERP export)
 */
export function buildExpensesReport(input = {}) {
  const { expenses = [], paymentRequests = [], treasuryMovements = [], startDate = '', endDate = '', payrollSplit = null } = input;
  const inPeriod = (iso) => Boolean(iso) && iso >= startDate && iso <= endDate;

  const requestByExpense = new Map();
  for (const r of paymentRequests) {
    const id = String(r.expenseID || '').trim();
    if (!id) continue;
    const prev = requestByExpense.get(id);
    // Keep the most advanced request when an expense has several (paid beats unpaid).
    if (!prev || num(r.paidAmountNgn) > num(prev.paidAmountNgn)) requestByExpense.set(id, r);
  }

  const rows = [];
  for (const ex of filterExpensesInRange(expenses, startDate, endDate)) {
    const id = String(ex.expenseID || '').trim();
    const req = requestByExpense.get(id) || null;
    const amountNgn = ngn(ex.amountNgn);
    const status = requestStatus(req, amountNgn);
    if (status === 'Rejected') continue;
    const description = String(req?.description || '').trim() || String(ex.expenseType || '').trim();
    const row = {
      expenseID: id,
      dateISO: day(ex.date),
      category: String(ex.category || '').trim() || 'Uncategorized',
      description,
      amountNgn,
      requestID: String(req?.requestID || ex.reference || '').trim(),
      status,
      paidAmountNgn: req ? ngn(req.paidAmountNgn) : null,
      paidAtISO: req ? day(req.paidAtISO) : '',
      payeeStaff: String(req?.staffDisplayName || '').trim(),
    };
    const cancelled = row.status === 'Cancelled';
    const rule = cancelled ? null : EXPENSE_RECLASS_RULES.find((r) => r.test(row));
    // A cancelled request is not an expense: no book category (left out of the book view).
    row.bookCategory = cancelled ? null : rule ? rule.to : bookGroupForErpCategory(row.category);
    row.reclassRule = rule ? rule.id : '';
    row.reclassLabel = rule ? `${rule.id} ${rule.label} → ${rule.to}` : '';
    rows.push(row);
  }
  rows.sort((a, b) => a.category.localeCompare(b.category) || a.dateISO.localeCompare(b.dateISO) || a.expenseID.localeCompare(b.expenseID));

  // --- Carriage: PO transport paid in the period, and expense lines that duplicate it -----------------
  const poTransport = treasuryMovements
    .filter((t) => t.type === 'TRANSPORT_PAYMENT' && inPeriod(day(t.postedAtISO)))
    .map((t) => ({
      treasuryMovementId: t.id,
      poID: String(t.sourceId || t.reference || '').trim(),
      agent: t.counterpartyName || '',
      dateISO: day(t.postedAtISO),
      amountNgn: -ngn(t.amountNgn),
      note: String(t.note || ''),
    }));
  const usedTransport = new Set();
  const carriageOverlap = [];
  for (const row of rows) {
    if (!/^carriage/i.test(row.category)) continue;
    const hit = poTransport.find(
      (t) =>
        !usedTransport.has(t.treasuryMovementId) &&
        t.amountNgn === row.amountNgn &&
        ((row.requestID && t.note.includes(row.requestID)) || t.dateISO === (row.paidAtISO || row.dateISO))
    );
    if (!hit) continue;
    usedTransport.add(hit.treasuryMovementId);
    row.carriageOverlap = `${hit.poID} transport ${hit.treasuryMovementId}`;
    carriageOverlap.push({
      expenseID: row.expenseID,
      description: row.description,
      amountNgn: row.amountNgn,
      poID: hit.poID,
      treasuryMovementId: hit.treasuryMovementId,
      agent: hit.agent,
      reason: row.requestID && hit.note.includes(row.requestID) ? `Treasury line names ${row.requestID}` : 'Same amount, same day',
    });
  }
  const poTransportNgn = sumBy(poTransport, 'amountNgn');
  const overlapNgn = sumBy(carriageOverlap, 'amountNgn');

  // --- Views -----------------------------------------------------------------------------------
  const byCategory = (key) => {
    const m = new Map();
    for (const r of rows) {
      if (r[key] == null) continue;
      m.set(r[key], (m.get(r[key]) || 0) + r.amountNgn);
    }
    return m;
  };
  const erp = byCategory('category');
  const book = byCategory('bookCategory');
  // ERP categories emptied by reclassification still show in the book view, at ₦0.
  for (const k of erp.keys()) {
    const group = bookGroupForErpCategory(k);
    if (!book.has(group)) book.set(group, 0);
  }
  const carriageKey = [...erp.keys()].find((k) => /^carriage/i.test(k)) || 'Carriage inward';
  book.set(carriageKey, (book.get(carriageKey) || 0) + poTransportNgn - overlapNgn);
  const toList = (m) => [...m.entries()].map(([category, amountNgn]) => ({ category, amountNgn })).sort((a, b) => b.amountNgn - a.amountNgn);
  const nonExpense = new Set([BOOK_REFUNDS, BOOK_STAFF_LOANS, BOOK_FIXED_ASSET]);
  const bookList = toList(book);

  const reclassifications = EXPENSE_RECLASS_RULES.map((rule) => {
    const lines = rows.filter((r) => r.reclassRule === rule.id);
    return {
      rule: rule.id,
      label: rule.label,
      to: rule.to,
      amountNgn: sumBy(lines, 'amountNgn'),
      fromCategories: [...new Set(lines.map((l) => l.category))],
      lines: lines.map((l) => ({ expenseID: l.expenseID, dateISO: l.dateISO, category: l.category, description: l.description, amountNgn: l.amountNgn })),
    };
  }).filter((r) => r.lines.length);

  // --- Payroll (Admin salary) -------------------------------------------------------------------
  const adminSalary = rows.filter((r) => /^admin salary/i.test(r.category));
  const payrollLines = adminSalary.filter((r) => /salar|wage/i.test(r.description));
  const payrollGrossNgn = sumBy(payrollLines, 'amountNgn');
  const splitTotal = payrollSplit ? payrollSplit.reduce((s, g) => s + ngn(g.grossNgn), 0) : null;
  const payroll = {
    adminSalaryNgn: sumBy(adminSalary, 'amountNgn'),
    payrollGrossNgn,
    split: payrollSplit ? payrollSplit.map((g) => ({ label: g.label, grossNgn: ngn(g.grossNgn) })) : null,
    splitDifferenceNgn: payrollSplit ? payrollGrossNgn - splitTotal : null,
    movedOutByRule: adminSalary
      .filter((r) => !payrollLines.includes(r) && r.reclassRule)
      .map((r) => ({ expenseID: r.expenseID, description: r.description, amountNgn: r.amountNgn, rule: r.reclassLabel })),
    notExplainedByPayroll: adminSalary
      .filter((r) => !payrollLines.includes(r) && !r.reclassRule && r.status !== 'Cancelled')
      .map((r) => ({ expenseID: r.expenseID, description: r.description, amountNgn: r.amountNgn })),
  };

  // --- Payment requests paid in the period, and the bridge to expenses by date --------------------
  const paidInPeriod = paymentRequests.filter((r) => num(r.paidAmountNgn) > 0 && inPeriod(day(r.paidAtISO)));
  const paidInPeriodIds = new Set(paidInPeriod.map((r) => String(r.expenseID || '').trim()));
  const rowIds = new Set(rows.map((r) => r.expenseID));
  const bridgeLines = [
    { item: 'Expenses dated in the period (ERP)', amountNgn: sumBy(rows, 'amountNgn') },
    {
      item: 'Less: no payment request (posted directly, e.g. bank charges)',
      amountNgn: -sumBy(rows.filter((r) => r.status === 'No payment request'), 'amountNgn'),
    },
    { item: 'Less: payment request cancelled', amountNgn: -sumBy(rows.filter((r) => r.status === 'Cancelled'), 'amountNgn') },
    {
      item: 'Less: not paid in the period (paid earlier / later / still pending)',
      amountNgn: -sumBy(
        rows.filter((r) => !['No payment request', 'Cancelled'].includes(r.status) && !paidInPeriodIds.has(r.expenseID)),
        'amountNgn'
      ),
    },
    {
      item: 'Less: paid short of the expense amount',
      amountNgn: -rows
        .filter((r) => paidInPeriodIds.has(r.expenseID))
        .reduce((s, r) => s + Math.max(0, r.amountNgn - ngn(r.paidAmountNgn)), 0),
    },
    {
      item: 'Add: paid in the period for expenses dated outside it',
      amountNgn: sumBy(paidInPeriod.filter((r) => !rowIds.has(String(r.expenseID || '').trim())), 'paidAmountNgn'),
    },
  ];
  const paidInPeriodNgn = sumBy(paidInPeriod, 'paidAmountNgn');
  const bridgeTotal = bridgeLines.reduce((s, l) => s + l.amountNgn, 0);

  const exceptions = [
    ...rows.filter((r) => r.reclassRule).map((r) => ({ kind: 'Check category', expenseID: r.expenseID, amountNgn: r.amountNgn, note: r.reclassLabel })),
    ...carriageOverlap.map((o) => ({
      kind: 'Possible double count with PO transport',
      expenseID: o.expenseID,
      amountNgn: o.amountNgn,
      note: `${o.poID} ${o.treasuryMovementId} (${o.agent}) — ${o.reason}`,
    })),
    ...payroll.notExplainedByPayroll.map((p) => ({
      kind: 'Admin salary not explained by payroll',
      expenseID: p.expenseID,
      amountNgn: p.amountNgn,
      note: p.description,
    })),
    ...rows
      .filter((r) => r.status === 'Cancelled')
      .map((r) => ({
        kind: 'Cancelled payment request — not an expense (left out of the book view)',
        expenseID: r.expenseID,
        amountNgn: r.amountNgn,
        note: `${r.category}: ${r.description}`,
      })),
  ];

  return {
    startDate,
    endDate,
    rows,
    totals: { lineCount: rows.length, amountNgn: sumBy(rows, 'amountNgn') },
    erpByCategory: toList(erp),
    bookByCategory: bookList,
    bookExpenseTotalNgn: bookList.filter((c) => !nonExpense.has(c.category)).reduce((s, c) => s + c.amountNgn, 0),
    reclassifications,
    carriage: { poTransport, poTransportNgn, overlap: carriageOverlap, overlapNgn },
    payroll,
    paymentRequestsPaid: {
      count: paidInPeriod.length,
      amountNgn: paidInPeriodNgn,
      bridge: bridgeLines,
      unexplainedNgn: paidInPeriodNgn - bridgeTotal,
    },
    exceptions,
    warningCount: rows.filter((r) => r.reclassRule).length,
  };
}
