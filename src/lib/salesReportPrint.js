/**
 * Print / Excel layout for the sales report v2 (see `salesReportCore.js`).
 */
import { formatNgn } from './formatNgn';
import { displayDocNumber, displayTxnDateShort } from './reportDisplayFormat';
import { SALES_REPORT_GROUP_OUTSTANDING, salesPaymentsReceivedSummary } from './liveAnalytics';

const signedNgn = (n) => (Number(n) < 0 ? `(${formatNgn(Math.abs(Number(n)))})` : formatNgn(Number(n) || 0));
const docNo = (v) => displayDocNumber(v) || v || '—';
const shortDate = (v) => (v ? displayTxnDateShort(v) || v : '—');

/** "Check" cell: suspended receipts kept, and bank ≠ receipt method. */
export function salesRowCheckText(r) {
  const parts = [];
  if (r.suspended) parts.push('Suspended (kept: reached bank)');
  if (r.bankNote) parts.push(r.bankNote);
  return parts.join(' · ');
}

/**
 * @param {ReturnType<import('./salesReportCore').buildSalesReport>} report
 * @param {{ title: string, refundedInPeriodNgn?: number, companyCutInPeriodNgn?: number }} opts
 */
export function salesReportPrintPayload(report, opts) {
  const s = salesPaymentsReceivedSummary(report.rows, opts.refundedInPeriodNgn || 0);
  const rows = report.rows.map((r) => {
    const isDebt = r.group === SALES_REPORT_GROUP_OUTSTANDING;
    return {
      group: r.group,
      paymentDateISO: shortDate(r.paymentDateISO),
      firstProductionDateISO: shortDate(r.firstProductionDateISO),
      customerName: r.customerName || '—',
      quotationRef: docNo(r.quotationRef),
      receiptNo: docNo(r.receiptId || r.ledgerEntryId),
      amountPaidNgn: isDebt ? '—' : formatNgn(r.amountPaidNgn),
      outstandingBalanceNgn: formatNgn(r.outstandingBalanceNgn || 0),
      bank: isDebt ? '—' : r.bankLabel || '—',
      check: isDebt ? '' : salesRowCheckText(r),
      bankReference: r.bankReference || r.paymentMethod || '—',
      _amountPaidNgn: isDebt ? 0 : Number(r.amountPaidNgn) || 0,
      _outstandingBalanceNgn: isDebt ? Number(r.outstandingBalanceNgn) || 0 : 0,
    };
  });

  const cash = report.cashReceived;
  const rec = report.recognised;
  const recon = report.reconciliation;
  const refunds = Math.round(Number(opts.refundedInPeriodNgn) || 0);

  const reconRows = [
    { item: recon.startLabel, detail: '', amountNgn: formatNgn(recon.startNgn) },
    ...recon.lines.flatMap((l) => [
      { item: l.label, detail: l.items.length ? `${l.items.length} item(s)` : 'none', amountNgn: signedNgn(l.amountNgn) },
      ...l.items.map((i) => ({
        item: `   ${docNo(i.ledgerEntryId || i.treasuryMovementId)} · ${i.customerName || '—'}`,
        detail: [shortDate(i.paymentDateISO), i.quotationRef ? docNo(i.quotationRef) : '', i.note || ''].filter((x) => x && x !== '—').join(' · '),
        amountNgn: signedNgn(i.amountNgn),
      })),
    ]),
    { item: recon.endLabel, detail: '', amountNgn: formatNgn(recon.endNgn) },
    { item: 'Unexplained difference', detail: '', amountNgn: signedNgn(recon.unexplainedNgn) },
  ];

  const exceptionRows = report.exceptions.map((e) => ({
    kind: e.kind,
    receiptNo: docNo(e.receiptId || e.ledgerEntryId),
    customerName: e.customerName || '—',
    quotationRef: docNo(e.quotationRef),
    paymentDateISO: shortDate(e.paymentDateISO),
    receiptAmountNgn: formatNgn(e.receiptAmountNgn),
    treasuryInPeriodNgn: formatNgn(e.treasuryInPeriodNgn),
    note: e.note || '',
  }));

  return {
    title: opts.title,
    columns: [
      { key: 'paymentDateISO', label: 'Date', width: '6%' },
      { key: 'firstProductionDateISO', label: 'Prod', width: '6%' },
      { key: 'customerName', label: 'Customer', width: '14%' },
      { key: 'quotationRef', label: 'Quote', width: '7%' },
      { key: 'receiptNo', label: 'Receipt', width: '7%' },
      { key: 'amountPaidNgn', label: 'Paid', width: '10%', align: 'right', minWidth: '6.5rem' },
      { key: 'outstandingBalanceNgn', label: 'Balance', width: '10%', align: 'right', minWidth: '6.5rem' },
      { key: 'bank', label: 'Bank (treasury)', width: '8%' },
      { key: 'check', label: 'Check', width: '17%', wrap: true },
      { key: 'bankReference', label: 'Remarks', width: '15%', wrap: true },
    ],
    rows,
    grouping: {
      groupBy: 'group',
      subtotalKey: '_amountPaidNgn',
      subtotalColumnKey: 'amountPaidNgn',
      sumColumns: [
        { key: '_amountPaidNgn', columnKey: 'amountPaidNgn' },
        { key: '_outstandingBalanceNgn', columnKey: 'outstandingBalanceNgn' },
      ],
      groupLabel: 'Category',
      subtotalLabel: 'Subtotal',
      totalLabel: 'Total',
    },
    summaryLines: [
      { label: '(1) Cash received in period (treasury, by posting date)', value: formatNgn(cash.totalNgn) },
      ...cash.byAccount.map((a) => ({ label: `      ${a.displayName || a.label}`, value: formatNgn(a.amountNgn) })),
      { label: '(2) Recognised sales (produced in period)', value: formatNgn(rec.totalNgn) },
      { label: '      Materials produced in period', value: formatNgn(rec.producedNgn) },
      { label: '      Materials not produced in period (credit)', value: formatNgn(rec.notProducedNgn) },
      {
        label: '      Excluded: receipts reversed in treasury',
        value: `${formatNgn(rec.excludedReversedNgn)} · ${rec.excludedReversedRows.length} receipt(s)`,
      },
      {
        label: '      Includes suspended receipts that reached the bank',
        value: `${formatNgn(rec.suspendedKeptNgn)} · ${rec.suspendedKeptCount} receipt(s)`,
      },
      { label: 'Reconciliation (2) → (1): unexplained', value: signedNgn(recon.unexplainedNgn) },
      { label: 'Receipt/treasury exceptions', value: String(report.exceptions.length) },
      { label: 'Bank differs from receipt method', value: `${report.bankMismatchCount} row(s)` },
      { label: 'Less: Refunds paid in period', value: formatNgn(refunds) },
      { label: 'Company cut withdrawn in period', value: formatNgn(opts.companyCutInPeriodNgn || 0) },
      { label: 'Net sales (Recognised sales − Refunds)', value: formatNgn(rec.totalNgn - refunds) },
      {
        label: 'Outstanding balance (debtors)',
        value: `${formatNgn(s.outstandingNgn)} · ${s.outstandingQuoteCount} quote(s)`,
      },
    ],
    appendixSections: [
      {
        title: 'Reconciliation: recognised sales → cash received',
        columns: [
          { key: 'item', label: 'Item', width: '45%' },
          { key: 'detail', label: 'Detail', width: '35%', wrap: true },
          { key: 'amountNgn', label: '₦', width: '20%', align: 'right' },
        ],
        rows: reconRows,
      },
      {
        title: 'Exceptions: receipts vs treasury',
        columns: [
          { key: 'kind', label: 'Exception', width: '18%' },
          { key: 'receiptNo', label: 'Receipt', width: '8%' },
          { key: 'customerName', label: 'Customer', width: '16%' },
          { key: 'quotationRef', label: 'Quote', width: '8%' },
          { key: 'paymentDateISO', label: 'Date', width: '7%' },
          { key: 'receiptAmountNgn', label: 'Receipt ₦', width: '11%', align: 'right' },
          { key: 'treasuryInPeriodNgn', label: 'Treasury in period ₦', width: '11%', align: 'right' },
          { key: 'note', label: 'Note', width: '21%', wrap: true },
        ],
        rows: exceptionRows,
      },
    ],
  };
}

/** Excel sheets for the sales report v2. */
export function salesReportExcelSheets(report) {
  const sales = report.rows.map((r) => ({
    category: r.group,
    paymentDateISO: r.paymentDateISO,
    firstProductionDateISO: r.firstProductionDateISO || '',
    customerName: r.customerName,
    quotationRef: r.quotationRef,
    receiptId: r.receiptId || '',
    receiptStatus: r.receiptStatus || '',
    amountPaidNgn: r.amountPaidNgn,
    outstandingBalanceNgn: Number(r.outstandingBalanceNgn) || 0,
    bankTreasury: r.bankLabel || '',
    treasuryInPeriodNgn: r.treasuryInPeriodNgn ?? '',
    check: r.group === SALES_REPORT_GROUP_OUTSTANDING ? '' : salesRowCheckText(r),
    paymentMethod: r.paymentMethod,
    bankReference: r.bankReference,
    ledgerEntryId: r.ledgerEntryId,
  }));
  const cash = report.cashReceived.byAccount.map((a) => ({
    account: a.displayName || a.label,
    receiptsInNgn: a.receiptsInNgn,
    advancesInNgn: a.advancesInNgn,
    reversalsOutNgn: a.reversalsOutNgn,
    cashReceivedNgn: a.amountNgn,
  }));
  const recon = report.reconciliation;
  const reconciliation = [
    { line: recon.startLabel, ledgerEntryId: '', customer: '', dateISO: '', note: '', amountNgn: recon.startNgn },
    ...recon.lines.flatMap((l) => [
      { line: l.label, ledgerEntryId: '', customer: '', dateISO: '', note: `${l.items.length} item(s)`, amountNgn: l.amountNgn },
      ...l.items.map((i) => ({
        line: '',
        ledgerEntryId: i.ledgerEntryId || i.treasuryMovementId || '',
        customer: i.customerName || '',
        dateISO: i.paymentDateISO || '',
        note: [i.quotationRef, i.note].filter(Boolean).join(' · '),
        amountNgn: i.amountNgn,
      })),
    ]),
    { line: recon.endLabel, ledgerEntryId: '', customer: '', dateISO: '', note: '', amountNgn: recon.endNgn },
    { line: 'Unexplained difference', ledgerEntryId: '', customer: '', dateISO: '', note: '', amountNgn: recon.unexplainedNgn },
  ];
  const exceptions = report.exceptions.map((e) => ({
    exception: e.kind,
    ledgerEntryId: e.ledgerEntryId,
    customer: e.customerName,
    quotationRef: e.quotationRef,
    dateISO: e.paymentDateISO,
    receiptAmountNgn: e.receiptAmountNgn,
    treasuryInPeriodNgn: e.treasuryInPeriodNgn,
    note: e.note || '',
  }));
  return [
    { name: 'Sales_report', rows: sales },
    { name: 'Cash_by_account', rows: cash },
    { name: 'Reconciliation', rows: reconciliation },
    { name: 'Exceptions', rows: exceptions },
  ];
}
