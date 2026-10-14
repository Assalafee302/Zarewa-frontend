/**
 * Print / Excel layout for the expenses report v2 (see `expensesReportCore.js`).
 */
import { formatNgn } from './formatNgn';
import { displayDocNumber, displayTxnDateShort } from './reportDisplayFormat';

const signedNgn = (n) => (Number(n) < 0 ? `(${formatNgn(Math.abs(Number(n)))})` : formatNgn(Number(n) || 0));
const docNo = (v) => displayDocNumber(v) || v || '—';
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

/**
 * @param {ReturnType<import('./expensesReportCore').buildExpensesReport>} report
 * @param {{ title: string, refundRows?: object[], companyCutRows?: object[] }} opts — print rows already shaped
 *   like the expense rows (groupKey, date, ref, party, detail, amount, status, _amountNgn)
 */
export function expensesReportPrintPayload(report, opts) {
  const expenseRows = report.rows.map((r) => ({
    groupKey: `Expense · ${r.category}`,
    section: 'Expense',
    date: shortDate(r.dateISO),
    ref: docNo(r.expenseID),
    party: r.description || '—',
    detail: r.requestID ? docNo(r.requestID) : '—',
    amount: formatNgn(r.amountNgn),
    status: r.status,
    check: [r.reclassLabel, r.carriageOverlap ? `Possible double count: ${r.carriageOverlap}` : ''].filter(Boolean).join(' · '),
    _amountNgn: r.amountNgn,
  }));
  const refundRows = opts.refundRows || [];
  const companyCutRows = opts.companyCutRows || [];
  const rows = [...expenseRows, ...refundRows, ...companyCutRows];
  const refundTotal = refundRows.reduce((s, r) => s + (Number(r._amountNgn) || 0), 0);
  const cutTotal = companyCutRows.reduce((s, r) => s + (Number(r._amountNgn) || 0), 0);
  const pr = report.paymentRequestsPaid;

  return {
    title: opts.title,
    readable: true,
    columns: [
      { key: 'date', label: 'Date', width: '8%' },
      { key: 'ref', label: 'Ref', width: '8%' },
      { key: 'party', label: 'Description / Customer', width: '28%', wrap: true },
      { key: 'detail', label: 'Request / Quotation', width: '11%', wrap: true },
      { key: 'amount', label: 'Amount', width: '12%', align: 'right', minWidth: '6.5rem' },
      { key: 'status', label: 'Status', width: '10%' },
      { key: 'check', label: 'Check category', width: '23%', wrap: true },
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
      { label: 'Expenses total (ERP categories)', value: formatNgn(report.totals.amountNgn) },
      { label: 'Book expense total (after reclassification)', value: formatNgn(report.bookExpenseTotalNgn) },
      { label: 'Lines to check / reclassified', value: String(report.warningCount) },
      { label: 'Payment requests paid in period', value: `${formatNgn(pr.amountNgn)} · ${pr.count} request(s)` },
      { label: 'Refunds paid', value: formatNgn(refundTotal) },
      { label: 'Company cut withdrawn', value: formatNgn(cutTotal) },
    ],
    appendixSections: [
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

/** Excel sheets for the expenses report v2 (amount columns safe to SUM). */
export function expensesReportExcelSheets(report, { refundRows = [], companyCutRows = [] } = {}) {
  return [
    {
      name: 'Expenses',
      rows: report.rows.map((r) => ({
        expenseID: r.expenseID,
        dateISO: r.dateISO,
        erpCategory: r.category,
        bookCategory: r.bookCategory,
        description: r.description,
        amountNgn: r.amountNgn,
        status: r.status,
        requestID: r.requestID,
        paidAmountNgn: r.paidAmountNgn ?? '',
        paidAtISO: r.paidAtISO,
        reclassRule: r.reclassLabel,
        carriageOverlap: r.carriageOverlap || '',
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
    ...(refundRows.length ? [{ name: 'Refunds_paid', rows: refundRows }] : []),
    ...(companyCutRows.length ? [{ name: 'Company_cut', rows: companyCutRows }] : []),
  ];
}
