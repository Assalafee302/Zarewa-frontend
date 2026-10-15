/**
 * Print / Excel layout for the expenses report v2 (see `expensesReportCore.js`).
 */
import { formatNgn } from './formatNgn';
import { displayTxnDateShort } from './reportDisplayFormat';

const signedNgn = (n) => (Number(n) < 0 ? `(${formatNgn(Math.abs(Number(n)))})` : formatNgn(Number(n) || 0));
/** Full ids on every line (round 2, L1/L7). */
const docNo = (v) => String(v ?? '').trim() || '—';
const sumAmount = (rows) => rows.reduce((s, r) => s + (Number(r._amountNgn ?? r.amountNgn) || 0), 0);

export const EXPENSES_BALANCING_TITLE = 'Balancing entry — not an expense';
export const EXPENSES_REFUNDS_LINE = 'Refunds paid in period — see Refund report';
const shortDate = (v) => (v ? displayTxnDateShort(v) || v : '—');

/** ERP vs book amount per category, every category that appears in either view. */
export function expensesCategoryComparison(report) {
  const erp = new Map(report.erpByCategory.map((c) => [c.category, c.amountNgn]));
  const book = new Map(report.bookByCategory.map((c) => [c.category, c.amountNgn]));
  return [...new Set([...erp.keys(), ...book.keys()])]
    .map((category) => ({
      category,
      erpNgn: erp.get(category) || 0,
      bookNgn: book.get(category) || 0,
      differenceNgn: (book.get(category) || 0) - (erp.get(category) || 0),
    }))
    .sort((a, b) => b.bookNgn - a.bookNgn || a.category.localeCompare(b.category));
}

/** Payment columns for one expense line (round 2, A4). */
function paymentCells(r) {
  return {
    paidDate: r.paidDateISO ? shortDate(r.paidDateISO) : r.paidAtISO ? shortDate(r.paidAtISO) : '',
    paidFrom: r.paidFrom || '',
    paidBy: r.paidBy || '',
    treasury: (r.treasuryMovementIds || []).join(', '),
    bankLine: (r.bankLineIds || []).join(', '),
  };
}

/**
 * @param {ReturnType<import('./expensesReportCore').buildExpensesReport>} report
 * @param {{ title: string, refundRows?: object[], companyCutRows?: object[] }} opts — refund / company-cut rows are
 *   only totalled: their lines belong to the Refund report (round 2, R1)
 */
export function expensesReportPrintPayload(report, opts) {
  const rows = report.rows.map((r) => ({
    groupKey: `Expense · ${r.category}`,
    section: 'Expense',
    date: shortDate(r.dateISO),
    ref: docNo(r.expenseID),
    party: r.description || '—',
    detail: r.requestID ? docNo(r.requestID) : '—',
    amount: formatNgn(r.amountNgn),
    status: r.status,
    ...paymentCells(r),
    check: [r.reclassLabel, r.carriageOverlap ? `Possible double count: ${r.carriageOverlap}` : ''].filter(Boolean).join(' · '),
    _amountNgn: r.amountNgn,
  }));
  const refundTotal = sumAmount(opts.refundRows || []);
  const cutTotal = sumAmount(opts.companyCutRows || []);
  const pr = report.paymentRequestsPaid;
  const bal = report.balancingEntries || { rows: [], amountNgn: 0 };

  return {
    title: opts.title,
    readable: true,
    columns: [
      { key: 'date', label: 'Incurred', width: '6%' },
      { key: 'ref', label: 'Expense', width: '8%' },
      { key: 'party', label: 'Description', width: '16%', wrap: true },
      { key: 'detail', label: 'Request', width: '8%' },
      { key: 'amount', label: 'Amount', width: '8%', align: 'right', minWidth: '6.5rem' },
      { key: 'status', label: 'Status', width: '7%' },
      { key: 'paidDate', label: 'Paid', width: '6%' },
      { key: 'paidFrom', label: 'Paid from', width: '11%', wrap: true },
      { key: 'paidBy', label: 'Paid by', width: '7%' },
      { key: 'treasury', label: 'Treasury line', width: '8%' },
      { key: 'bankLine', label: 'Bank line', width: '7%' },
      { key: 'check', label: 'Check category', width: '8%', wrap: true },
    ],
    rows,
    grouping: {
      groupBy: 'groupKey',
      subtotalKey: '_amountNgn',
      subtotalColumnKey: 'amount',
      groupLabel: 'Group',
      subtotalLabel: 'Subtotal',
      totalLabel: 'Overall amount',
    },
    summaryLines: [
      { label: 'Expense lines', value: String(report.totals.lineCount) },
      { label: 'Expenses total (ERP categories, balancing entries excluded)', value: formatNgn(report.totals.amountNgn) },
      { label: 'Book expense total (after reclassification; cancelled requests left out)', value: formatNgn(report.bookExpenseTotalNgn) },
      ...(bal.rows.length
        ? [{ label: `${EXPENSES_BALANCING_TITLE} (outside all totals)`, value: `${formatNgn(bal.amountNgn)} · ${bal.rows.map((r) => r.requestID || r.expenseID).join(', ')}` }]
        : []),
      { label: 'Lines to check / reclassified', value: String(report.warningCount) },
      { label: 'Payment requests paid in period', value: `${formatNgn(pr.amountNgn)} · ${pr.count} request(s)` },
      { label: EXPENSES_REFUNDS_LINE, value: formatNgn(refundTotal) },
      { label: 'Company cut withdrawn — see Refund report', value: formatNgn(cutTotal) },
    ],
    appendixSections: [
      ...(bal.rows.length
        ? [{
            title: EXPENSES_BALANCING_TITLE,
            boxed: true,
            columns: [
              { key: 'date', label: 'Date', width: '8%' },
              { key: 'ref', label: 'Expense', width: '11%' },
              { key: 'detail', label: 'Request', width: '11%' },
              { key: 'category', label: 'ERP category', width: '11%' },
              { key: 'party', label: 'Description', width: '17%', wrap: true },
              { key: 'amount', label: 'Expense ₦', width: '10%', align: 'right' },
              { key: 'paid', label: 'Paid ₦', width: '10%', align: 'right' },
              { key: 'treasury', label: 'Treasury line', width: '11%' },
              { key: 'bankLine', label: 'Bank line', width: '11%' },
            ],
            rows: [
              ...bal.rows.map((r) => ({
                date: shortDate(r.dateISO),
                ref: docNo(r.expenseID),
                detail: docNo(r.requestID),
                category: r.category,
                party: r.description,
                amount: formatNgn(r.amountNgn),
                paid: r.paidAmountNgn == null ? '' : formatNgn(r.paidAmountNgn),
                treasury: (r.treasuryMovementIds || []).join(', '),
                bankLine: (r.bankLineIds || []).join(', '),
              })),
              { date: '', ref: '', detail: '', category: '', party: 'Total (not in any category total)', amount: formatNgn(bal.amountNgn), paid: '', treasury: '', bankLine: '' },
            ],
          }]
        : []),
      {
        title: 'Expenses by category — ERP vs book (after reclassification)',
        columns: [
          { key: 'category', label: 'Category', width: '40%' },
          { key: 'erp', label: 'ERP', width: '20%', align: 'right' },
          { key: 'book', label: 'Book', width: '20%', align: 'right' },
          { key: 'diff', label: 'Moved', width: '20%', align: 'right' },
        ],
        rows: [
          ...expensesCategoryComparison(report).map((c) => ({
            category: c.category,
            erp: formatNgn(c.erpNgn),
            book: formatNgn(c.bookNgn),
            diff: c.differenceNgn ? signedNgn(c.differenceNgn) : '',
          })),
          { category: 'Total', erp: formatNgn(report.totals.amountNgn), book: formatNgn(report.bookByCategory.reduce((s, c) => s + c.amountNgn, 0)), diff: '' },
          ...(bal.rows.length
            ? [
                { category: `${EXPENSES_BALANCING_TITLE} (outside the totals)`, erp: formatNgn(bal.amountNgn), book: '', diff: '' },
                { category: 'ERP grand total incl. balancing entries', erp: formatNgn(report.totals.erpIncludingBalancingNgn), book: '', diff: '' },
              ]
            : []),
        ],
      },
      {
        title: 'Reclassifications (rule-based — every line moved)',
        columns: [
          { key: 'rule', label: 'Rule', width: '30%', wrap: true },
          { key: 'ref', label: 'Expense', width: '10%' },
          { key: 'from', label: 'From', width: '16%' },
          { key: 'description', label: 'Description', width: '28%', wrap: true },
          { key: 'amount', label: '₦', width: '16%', align: 'right' },
        ],
        rows: report.reclassifications.flatMap((r) => [
          { rule: `${r.rule} ${r.label} → ${r.to}`, ref: '', from: r.fromCategories.join(', '), description: `${r.lines.length} line(s)`, amount: formatNgn(r.amountNgn) },
          ...r.lines.map((l) => ({ rule: '', ref: docNo(l.expenseID), from: l.category, description: l.description, amount: formatNgn(l.amountNgn) })),
        ]),
      },
      {
        title: 'Carriage inward — PO transport and possible double counts',
        columns: [
          { key: 'item', label: 'Item', width: '55%', wrap: true },
          { key: 'ref', label: 'Ref', width: '25%' },
          { key: 'amount', label: '₦', width: '20%', align: 'right' },
        ],
        rows: [
          ...report.carriage.poTransport.map((t) => ({ item: `PO transport paid — ${t.agent} (${shortDate(t.dateISO)})`, ref: `${docNo(t.poID)} · ${docNo(t.treasuryMovementId)}`, amount: formatNgn(t.amountNgn) })),
          { item: 'PO transport added to carriage (book)', ref: '', amount: formatNgn(report.carriage.poTransportNgn) },
          ...report.carriage.overlap.map((o) => ({ item: `Less: ${o.description} — duplicates PO transport (${o.reason})`, ref: `${docNo(o.expenseID)} ↔ ${docNo(o.poID)}`, amount: signedNgn(-o.amountNgn) })),
        ],
      },
      {
        title: 'Admin salary — payroll',
        columns: [
          { key: 'item', label: 'Item', width: '70%', wrap: true },
          { key: 'amount', label: '₦', width: '30%', align: 'right' },
        ],
        rows: [
          { item: 'Admin salary (ERP)', amount: formatNgn(report.payroll.adminSalaryNgn) },
          { item: 'Payroll gross (salary / wages lines)', amount: formatNgn(report.payroll.payrollGrossNgn) },
          ...(report.payroll.split
            ? [
                ...report.payroll.split.map((g) => ({ item: `   ${g.label}`, amount: formatNgn(g.grossNgn) })),
                { item: '   Payroll gross not covered by the split', amount: signedNgn(report.payroll.splitDifferenceNgn) },
              ]
            : [{ item: '   Payroll split: not in the data source (HR payroll)', amount: '' }]),
          ...(report.payroll.movedOutByRule || []).map((p) => ({ item: `Moved out: ${docNo(p.expenseID)} ${p.description} (${p.rule})`, amount: formatNgn(p.amountNgn) })),
          ...report.payroll.notExplainedByPayroll.map((p) => ({ item: `Not explained by payroll: ${docNo(p.expenseID)} ${p.description}`, amount: formatNgn(p.amountNgn) })),
        ],
      },
      {
        title: 'Expenses by date → payment requests paid in the period',
        columns: [
          { key: 'item', label: 'Item', width: '70%', wrap: true },
          { key: 'amount', label: '₦', width: '30%', align: 'right' },
        ],
        rows: [
          ...pr.bridge.map((l) => ({ item: l.item, amount: signedNgn(l.amountNgn) })),
          { item: `Payment requests paid in the period (${pr.count})`, amount: formatNgn(pr.amountNgn) },
          { item: 'Unexplained difference', amount: signedNgn(pr.unexplainedNgn) },
        ],
      },
      {
        title: 'Expense exceptions',
        columns: [
          { key: 'kind', label: 'Exception', width: '26%' },
          { key: 'ref', label: 'Expense', width: '10%' },
          { key: 'amount', label: '₦', width: '14%', align: 'right' },
          { key: 'note', label: 'Note', width: '50%', wrap: true },
        ],
        rows: report.exceptions.map((e) => ({ kind: e.kind, ref: docNo(e.expenseID), amount: formatNgn(e.amountNgn), note: e.note })),
      },
    ],
  };
}

/**
 * Excel sheets for the expenses report v2 (amount columns safe to SUM). Refund / company-cut lines belong to the
 * Refund report (round 2, R1): only their totals appear, on the Summary sheet.
 */
export function expensesReportExcelSheets(report, { refundRows = [], companyCutRows = [] } = {}) {
  const bal = report.balancingEntries || { rows: [], amountNgn: 0 };
  return [
    {
      name: 'Summary',
      rows: [
        { item: 'Expenses total (ERP categories, balancing entries excluded)', amountNgn: report.totals.amountNgn },
        { item: 'Book expense total', amountNgn: report.bookExpenseTotalNgn },
        { item: `${EXPENSES_BALANCING_TITLE} (outside all totals)`, amountNgn: bal.amountNgn },
        { item: 'ERP grand total incl. balancing entries', amountNgn: report.totals.erpIncludingBalancingNgn ?? report.totals.amountNgn },
        { item: EXPENSES_REFUNDS_LINE, amountNgn: sumAmount(refundRows) },
        { item: 'Company cut withdrawn — see Refund report', amountNgn: sumAmount(companyCutRows) },
      ],
    },
    {
      name: 'Expenses',
      rows: report.rows.map((r) => ({
        expenseID: r.expenseID,
        dateISO: r.dateISO,
        erpCategory: r.category,
        bookCategory: r.bookCategory ?? 'Excluded — request cancelled',
        description: r.description,
        amountNgn: r.amountNgn,
        status: r.status,
        requestID: r.requestID,
        paidAmountNgn: r.paidAmountNgn ?? '',
        paidAtISO: r.paidAtISO,
        paidDateISO: r.paidDateISO || '',
        paidFrom: r.paidFrom || '',
        paidBy: r.paidBy || '',
        treasuryMovementIds: (r.treasuryMovementIds || []).join(', '),
        bankLineIds: (r.bankLineIds || []).join(', '),
        reclassRule: r.reclassLabel,
        carriageOverlap: r.carriageOverlap || '',
      })),
    },
    {
      name: 'Balancing_entries',
      rows: bal.rows.map((r) => ({
        expenseID: r.expenseID, requestID: r.requestID, dateISO: r.dateISO, erpCategory: r.category, description: r.description,
        amountNgn: r.amountNgn, paidAmountNgn: r.paidAmountNgn ?? '', treasuryMovementIds: (r.treasuryMovementIds || []).join(', '),
        bankLineIds: (r.bankLineIds || []).join(', '),
      })),
    },
    { name: 'ERP_vs_book', rows: expensesCategoryComparison(report) },
    {
      name: 'Reclassifications',
      rows: report.reclassifications.flatMap((r) =>
        r.lines.map((l) => ({ rule: r.rule, label: r.label, to: r.to, expenseID: l.expenseID, dateISO: l.dateISO, from: l.category, description: l.description, amountNgn: l.amountNgn }))
      ),
    },
    {
      name: 'Carriage_PO_transport',
      rows: [
        ...report.carriage.poTransport.map((t) => ({ line: 'PO transport paid', ref: t.poID, treasuryMovementId: t.treasuryMovementId, agent: t.agent, dateISO: t.dateISO, amountNgn: t.amountNgn, note: '' })),
        ...report.carriage.overlap.map((o) => ({ line: 'Expense duplicates PO transport (less)', ref: o.expenseID, treasuryMovementId: o.treasuryMovementId, agent: o.agent, dateISO: '', amountNgn: -o.amountNgn, note: o.reason })),
      ],
    },
    {
      name: 'Payroll',
      rows: [
        { item: 'Admin salary (ERP)', amountNgn: report.payroll.adminSalaryNgn },
        { item: 'Payroll gross (salary / wages lines)', amountNgn: report.payroll.payrollGrossNgn },
        ...(report.payroll.split || []).map((g) => ({ item: `Split: ${g.label}`, amountNgn: g.grossNgn })),
        ...report.payroll.notExplainedByPayroll.map((p) => ({ item: `Not explained by payroll: ${p.expenseID} ${p.description}`, amountNgn: p.amountNgn })),
      ],
    },
    { name: 'Payment_requests_bridge', rows: report.paymentRequestsPaid.bridge },
    { name: 'Exceptions', rows: report.exceptions },
  ];
}
