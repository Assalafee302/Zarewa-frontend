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

/** Bridge lines: cash received → goods produced (net), ending with the difference (expected ₦0). */
export function accrualBridgeLines(accrual) {
  const b = accrual.bridge;
  const lines = [
    { item: 'Cash received in period (treasury)', amountNgn: b.cashReceivedNgn },
    { item: 'Less: refunds paid in period', amountNgn: -b.refundsPaidNgn },
  ];
  if (b.cashNotAttributableNgn) {
    lines.push({ item: 'Less: cash not attributable to a customer (exceptions)', amountNgn: -b.cashNotAttributableNgn });
  }
  if (b.refundsNotAttributableNgn) {
    lines.push({ item: 'Add back: refunds with no customer (exceptions)', amountNgn: b.refundsNotAttributableNgn });
  }
  lines.push(
    { item: 'Add: increase in customer debts', amountNgn: b.increaseInDebtsNgn },
    { item: 'Less: increase in customer advances', amountNgn: -b.increaseInAdvancesNgn },
    { item: '= Sales by the bridge', amountNgn: b.bridgeTotalNgn },
    { item: 'Goods produced in period (net value)', amountNgn: b.producedNgn },
    { item: 'Difference', amountNgn: b.differenceNgn }
  );
  return lines;
}

/** Every accrual exception as one flat list. */
export function accrualExceptionRows(accrual) {
  const e = accrual.exceptions;
  return [
    ...e.zeroMetreJobs.map((x) => ({
      kind: x.kind, ref: x.jobID, ref2: x.quotationRef, customerName: x.customerName, dateISO: x.dateISO, amountNgn: x.amountNgn, note: x.note,
    })),
    ...e.refundsOverValue.map((x) => ({
      kind: x.kind, ref: x.quotationRef, ref2: '', customerName: x.customerName, dateISO: '', amountNgn: x.valueReducingRefundsNgn,
      note: `Quote total ${formatNgn(x.quoteTotalNgn)}; excess ${formatNgn(x.amountNgn)}`,
    })),
    ...e.doubleCountedAdvances.map((x) => ({
      kind: x.kind, ref: x.treasuryMovementId, ref2: x.ledgerEntryId, customerName: x.customerName, dateISO: x.dateISO, amountNgn: x.amountNgn,
      note: `Same money as ${x.advanceMovementId} (${x.advanceDateISO}). ${x.verification}. Not counted as cash.`,
    })),
    ...e.unassignedCash.map((x) => ({
      kind: x.kind, ref: x.treasuryMovementId, ref2: x.ledgerEntryId, customerName: x.counterpartyName, dateISO: x.dateISO, amountNgn: x.amountNgn,
      note: 'Left out of customer balances',
    })),
    ...e.unassignedRefunds.map((x) => ({
      kind: x.kind, ref: x.treasuryMovementId, ref2: x.ledgerEntryId, customerName: x.counterpartyName, dateISO: x.dateISO, amountNgn: x.amountNgn,
      note: 'Left out of customer balances',
    })),
    ...e.staleBalances.map((x) => ({
      kind: x.kind, ref: x.customerID, ref2: '', customerName: x.customerName, dateISO: '', amountNgn: x.amountNgn,
      note: `${x.note} — flagged, not hidden`,
    })),
  ];
}

function accrualPrintSections(report) {
  const acc = report.accrual;
  if (!acc) return { lines: [], sections: [] };
  const range = `${shortDate(acc.openingDate)} → ${shortDate(acc.endDate)}`;
  const lines = [
    { label: '(3) Accrual: goods produced in period (net value)', value: formatNgn(acc.producedNgn) },
    {
      label: `      Customer advances ${range}`,
      value: `${formatNgn(acc.balances.opening.advancesNgn)} → ${formatNgn(acc.balances.closing.advancesNgn)}`,
    },
    {
      label: `      Customer debts ${range}`,
      value: `${formatNgn(acc.balances.opening.debtsNgn)} → ${formatNgn(acc.balances.closing.debtsNgn)}`,
    },
    { label: '      Sales bridge difference', value: signedNgn(acc.bridge.differenceNgn) },
    ...(report.accrualHasFullHistory
      ? []
      : [{ label: '      Warning', value: 'Treasury before the period not loaded: customer balances incomplete' }]),
  ];
  const blankTotal = { dateISO: '', quotationRef: '', jobs: '', metres: '', quoteTotalNgn: '', refundsNgn: '', proRated: '' };
  const sections = [
    {
      title: 'Accrual: goods produced in period (by quotation, net value)',
      columns: [
        { key: 'dateISO', label: 'Completed', width: '8%' },
        { key: 'quotationRef', label: 'Quote', width: '8%' },
        { key: 'customerName', label: 'Customer', width: '20%' },
        { key: 'jobs', label: 'Jobs', width: '14%', wrap: true },
        { key: 'metres', label: 'Metres', width: '8%', align: 'right' },
        { key: 'quoteTotalNgn', label: 'Quote total', width: '11%', align: 'right' },
        { key: 'refundsNgn', label: 'Value-reducing refunds', width: '11%', align: 'right' },
        { key: 'valueNgn', label: 'Value in period', width: '12%', align: 'right' },
        { key: 'proRated', label: 'Pro-rated', width: '8%' },
      ],
      rows: [
        ...acc.producedRows.map((r) => ({
          dateISO: shortDate(r.firstCompletedISO),
          quotationRef: docNo(r.quotationRef),
          customerName: r.customerName || '—',
          jobs: r.jobIDs.map((j) => docNo(j)).join(', '),
          metres: Math.round(r.metresInPeriod * 100) / 100,
          quoteTotalNgn: formatNgn(r.quoteTotalNgn),
          refundsNgn: r.valueReducingRefundsNgn ? formatNgn(r.valueReducingRefundsNgn) : '',
          valueNgn: formatNgn(r.valueInPeriodNgn),
          proRated: r.proRated ? 'Yes' : '',
        })),
        { ...blankTotal, customerName: 'Total', valueNgn: formatNgn(acc.producedNgn) },
      ],
    },
    {
      title: 'Accrual: sales bridge (must be ₦0)',
      columns: [
        { key: 'item', label: 'Item', width: '70%' },
        { key: 'amountNgn', label: '₦', width: '30%', align: 'right' },
      ],
      rows: accrualBridgeLines(acc).map((l) => ({ item: l.item, amountNgn: signedNgn(l.amountNgn) })),
    },
    {
      title: `Accrual: customer balances (advance > 0, debt < 0) ${range}`,
      columns: [
        { key: 'customerName', label: 'Customer', width: '22%' },
        { key: 'openingNgn', label: 'Start', width: '12%', align: 'right' },
        { key: 'cashNgn', label: 'Cash in', width: '12%', align: 'right' },
        { key: 'refundsPaidNgn', label: 'Refunds paid', width: '11%', align: 'right' },
        { key: 'producedNgn', label: 'Produced', width: '12%', align: 'right' },
        { key: 'closingNgn', label: 'End', width: '12%', align: 'right' },
        { key: 'status', label: 'Status', width: '9%' },
        { key: 'stale', label: 'Check', width: '10%' },
      ],
      rows: [
        ...acc.balances.rows
          .filter((b) => b.openingNgn || b.closingNgn)
          .map((b) => ({
            customerName: b.customerName || b.customerID,
            openingNgn: signedNgn(b.openingNgn),
            cashNgn: b.cashNgn ? signedNgn(b.cashNgn) : '',
            refundsPaidNgn: b.refundsPaidNgn ? signedNgn(b.refundsPaidNgn) : '',
            producedNgn: b.producedNgn ? signedNgn(b.producedNgn) : '',
            closingNgn: signedNgn(b.closingNgn),
            status: b.closingNgn > 0 ? 'Advance' : b.closingNgn < 0 ? 'Debt' : 'Settled',
            stale: b.unchanged ? 'Unchanged' : '',
          })),
        {
          customerName: 'Total advances', openingNgn: formatNgn(acc.balances.opening.advancesNgn), cashNgn: '', refundsPaidNgn: '', producedNgn: '',
          closingNgn: formatNgn(acc.balances.closing.advancesNgn), status: '', stale: `Unchanged ${formatNgn(acc.balances.staleAdvancesNgn)}`,
        },
        {
          customerName: 'Total debts', openingNgn: formatNgn(acc.balances.opening.debtsNgn), cashNgn: '', refundsPaidNgn: '', producedNgn: '',
          closingNgn: formatNgn(acc.balances.closing.debtsNgn), status: '', stale: `Unchanged ${formatNgn(acc.balances.staleDebtsNgn)}`,
        },
      ],
    },
    {
      title: 'Accrual: exceptions',
      columns: [
        { key: 'kind', label: 'Exception', width: '22%' },
        { key: 'ref', label: 'Ref', width: '10%' },
        { key: 'ref2', label: 'Ref 2', width: '10%' },
        { key: 'customerName', label: 'Customer', width: '16%' },
        { key: 'dateISO', label: 'Date', width: '7%' },
        { key: 'amountNgn', label: '₦', width: '11%', align: 'right' },
        { key: 'note', label: 'Note', width: '24%', wrap: true },
      ],
      rows: accrualExceptionRows(acc).map((x) => ({
        ...x,
        ref: docNo(x.ref),
        ref2: x.ref2 ? docNo(x.ref2) : '',
        customerName: x.customerName || '—',
        dateISO: x.dateISO ? shortDate(x.dateISO) : '',
        amountNgn: signedNgn(x.amountNgn),
      })),
    },
  ];
  return { lines, sections };
}

/**
 * @param {ReturnType<import('./salesReportCore').buildSalesReport>} report
 * @param {{ title: string, refundedInPeriodNgn?: number, companyCutInPeriodNgn?: number }} opts
 */
export const SALES_LINE_PAYMENT = 'Payment line';
export const SALES_LINE_SUBTOTAL = 'Receipt subtotal';
export const SALES_LINE_DEBTOR = 'Debtor';

const paidByText = (l) => (l.paidBy ? l.paidBy : l.isCash ? 'not matched (cash)' : 'not matched');

/**
 * Sales rows at payment-line level: one row per treasury movement behind each receipt, then a subtotal
 * row for receipts split across more than one line. Debtor rows pass through. Amounts stay numeric.
 */
export function salesPaymentLineRows(report) {
  const out = [];
  for (const r of report.rows) {
    const base = {
      group: r.group,
      paymentDateISO: r.paymentDateISO || '',
      firstProductionDateISO: r.firstProductionDateISO || '',
      customerName: r.customerName || '',
      quotationRef: r.quotationRef || '',
      receiptNo: r.receiptId || r.ledgerEntryId || '',
      paymentMethod: r.paymentMethod || '',
      bankReference: r.bankReference || '',
    };
    if (r.group === SALES_REPORT_GROUP_OUTSTANDING) {
      out.push({ ...base, lineType: SALES_LINE_DEBTOR, amountNgn: null, outstandingBalanceNgn: Number(r.outstandingBalanceNgn) || 0 });
      continue;
    }
    const lines = r.paymentLines?.length
      ? r.paymentLines
      : [{ treasuryMovementId: '', postedDateISO: '', accountLabel: r.bankLabel || '', amountNgn: Number(r.amountPaidNgn) || 0, paidBy: '', check: r.bankNote || '' }];
    const split = lines.length > 1;
    lines.forEach((l, i) => {
      const checks = [];
      if (r.suspended) checks.push('Suspended (kept: reached bank)');
      if (l.check) checks.push(l.check);
      out.push({
        ...base,
        lineType: SALES_LINE_PAYMENT,
        treasuryMovementId: l.treasuryMovementId || '',
        postedDateISO: l.postedDateISO || '',
        bank: l.accountLabel || '',
        paidBy: paidByText(l),
        paidBySource: l.paidBySource || '',
        amountNgn: l.amountNgn,
        outstandingBalanceNgn: !split && i === 0 ? Number(r.outstandingBalanceNgn) || 0 : null,
        check: checks.join(' · '),
      });
    });
    if (split) {
      out.push({
        ...base,
        lineType: SALES_LINE_SUBTOTAL,
        treasuryMovementId: '',
        postedDateISO: '',
        bank: [...new Set(lines.map((l) => l.accountLabel).filter((x) => x && x !== '—'))].join(' + '),
        paidBy: '',
        amountNgn: Number(r.amountPaidNgn) || 0,
        outstandingBalanceNgn: Number(r.outstandingBalanceNgn) || 0,
        check: `${lines.length} payment lines`,
      });
    }
  }
  return out;
}

export function salesReportPrintPayload(report, opts) {
  const s = salesPaymentsReceivedSummary(report.rows, opts.refundedInPeriodNgn || 0);
  const rows = salesPaymentLineRows(report).map((r) => {
    const isDebt = r.lineType === SALES_LINE_DEBTOR;
    const isSubtotal = r.lineType === SALES_LINE_SUBTOTAL;
    return {
      group: r.group,
      paymentDateISO: isSubtotal ? '' : shortDate(r.paymentDateISO),
      firstProductionDateISO: isSubtotal ? '' : shortDate(r.firstProductionDateISO),
      customerName: isSubtotal ? '' : r.customerName || '—',
      paidBy: isDebt || isSubtotal ? '' : r.paidBy,
      quotationRef: docNo(r.quotationRef),
      receiptNo: isSubtotal ? `Subtotal ${docNo(r.receiptNo)}` : docNo(r.receiptNo),
      treasuryMovementId: r.treasuryMovementId ? docNo(r.treasuryMovementId) : '',
      postedDateISO: r.postedDateISO ? shortDate(r.postedDateISO) : '',
      amountPaidNgn: isDebt ? '—' : signedNgn(r.amountNgn),
      outstandingBalanceNgn: r.outstandingBalanceNgn == null ? '' : formatNgn(r.outstandingBalanceNgn),
      bank: isDebt ? '—' : r.bank || '—',
      check: isDebt ? '' : r.check,
      bankReference: isSubtotal ? '' : r.bankReference || r.paymentMethod || '—',
      // Subtotal rows are display only: they never add into the group totals.
      _amountPaidNgn: isDebt || isSubtotal ? 0 : Number(r.amountNgn) || 0,
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

  const accrualPrint = accrualPrintSections(report);

  return {
    title: opts.title,
    columns: [
      { key: 'paymentDateISO', label: 'Date', width: '5%' },
      { key: 'firstProductionDateISO', label: 'Prod', width: '5%' },
      { key: 'customerName', label: 'Customer', width: '11%' },
      { key: 'paidBy', label: 'Paid by', width: '12%', wrap: true },
      { key: 'quotationRef', label: 'Quote', width: '6%' },
      { key: 'receiptNo', label: 'Receipt', width: '8%' },
      { key: 'treasuryMovementId', label: 'Treasury line', width: '7%' },
      { key: 'postedDateISO', label: 'Posted', width: '5%' },
      { key: 'amountPaidNgn', label: 'Paid', width: '8%', align: 'right', minWidth: '6rem' },
      { key: 'outstandingBalanceNgn', label: 'Balance', width: '8%', align: 'right', minWidth: '6rem' },
      { key: 'bank', label: 'Account', width: '7%' },
      { key: 'check', label: 'Check', width: '10%', wrap: true },
      { key: 'bankReference', label: 'Remarks', width: '8%', wrap: true },
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
      ...accrualPrint.lines,
      { label: 'Receipt/treasury exceptions', value: String(report.exceptions.length) },
      { label: 'Payment lines (one per treasury movement)', value: String(report.paymentLineCount) },
      { label: 'Account differs from receipt method', value: `${report.paymentLineMismatchCount} line(s)` },
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
      ...accrualPrint.sections,
    ],
  };
}

/** Excel sheets for the sales report v2. */
export function salesReportExcelSheets(report) {
  // Subtotal rows carry lineType "Receipt subtotal": filter on lineType = "Payment line" before summing.
  const sales = salesPaymentLineRows(report).map((r) => ({
    category: r.group,
    lineType: r.lineType,
    paymentDateISO: r.paymentDateISO,
    firstProductionDateISO: r.firstProductionDateISO,
    customerName: r.customerName,
    paidBy: r.lineType === SALES_LINE_PAYMENT ? r.paidBy : '',
    paidBySource: r.lineType === SALES_LINE_PAYMENT ? r.paidBySource || 'not matched' : '',
    quotationRef: r.quotationRef,
    receiptId: r.receiptNo,
    treasuryMovementId: r.treasuryMovementId || '',
    postedDateISO: r.postedDateISO || '',
    account: r.lineType === SALES_LINE_DEBTOR ? '' : r.bank || '',
    amountPaidNgn: r.amountNgn ?? '',
    outstandingBalanceNgn: r.outstandingBalanceNgn ?? '',
    check: r.check || '',
    paymentMethod: r.paymentMethod,
    bankReference: r.bankReference,
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
  const acc = report.accrual;
  const accrualSheets = acc
    ? [
        {
          name: 'Accrual_produced',
          rows: acc.producedRows.map((r) => ({
            firstCompletedISO: r.firstCompletedISO,
            quotationRef: r.quotationRef,
            customerID: r.customerID,
            customer: r.customerName,
            jobs: r.jobIDs.join(', '),
            metresInPeriod: r.metresInPeriod,
            quoteTotalNgn: r.quoteTotalNgn,
            valueReducingRefundsNgn: r.valueReducingRefundsNgn,
            valueInPeriodNgn: r.valueInPeriodNgn,
            proRated: r.proRated ? 'Yes' : '',
          })),
        },
        {
          name: 'Customer_balances',
          rows: acc.balances.rows.map((b) => ({
            customerID: b.customerID,
            customer: b.customerName,
            startNgn: b.openingNgn,
            cashNgn: b.cashNgn,
            refundsPaidNgn: b.refundsPaidNgn,
            producedNgn: b.producedNgn,
            endNgn: b.closingNgn,
            status: b.closingNgn > 0 ? 'Advance' : b.closingNgn < 0 ? 'Debt' : 'Settled',
            unchangedInPeriod: b.unchanged ? 'Yes' : '',
          })),
        },
        { name: 'Sales_bridge', rows: accrualBridgeLines(acc) },
        { name: 'Accrual_exceptions', rows: accrualExceptionRows(acc) },
      ]
    : [];
  return [
    { name: 'Sales_report', rows: sales },
    { name: 'Cash_by_account', rows: cash },
    { name: 'Reconciliation', rows: reconciliation },
    { name: 'Exceptions', rows: exceptions },
    ...accrualSheets,
  ];
}
