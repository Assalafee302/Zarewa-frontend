import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatNgn } from '../Data/mockData';
import { displayDocNumber } from '../lib/reportDisplayFormat';
import {
  downloadStandardFinanceWorkbook,
  downloadStandardPurchasesWorkbook,
  downloadStandardSalesWorkbook,
  downloadStandardStockWorkbook,
} from '../lib/standardReportsDownload';
import {
  accruedApprovedPayablesRows,
  coilInventoryValuationRows,
  cogsMovementRows,
  filterAccessoryUsageInRange,
  filterBankReconciliationInRange,
  filterTreasuryMovementsInRange,
  grnCoilRegisterRows,
  purchaseOrderAccrualBridgeRows,
  quotationPaidNgnReceiptDiscrepancies,
  receiptAdvanceTreasuryReconciliationRows,
  refundPeriodOverviewRows,
  refundPeriodOverviewSummary,
  refundsPaidInPeriodRows,
  salesPaymentsReceivedRows,
  salesPaymentsReceivedSummary,
} from '../lib/liveAnalytics';
import { procurementKindFromPo } from '../lib/procurementPoKind';
import {
  PACK_CASH_BANK_AR,
  PACK_EXPENSES_REFUNDS,
  PACK_GL_AUDIT,
  PACK_MATERIAL_EXCEPTIONS,
  PACK_MATERIAL_TRANSACTION,
  PACK_OPS_PROCUREMENT,
  PACK_PERIOD_COSTS_INVENTORY,
  PACK_PURCHASE_REGISTER,
  PACK_REFUND_PERIOD,
  PACK_SALES_CUSTOMER,
} from '../lib/reportsExportCatalog.js';
import {
  buildPaidExpensePrintRows,
  downloadRows,
  fetchMaterialTransactionReport,
  fetchPurchaseRegisterReport,
  materialTransactionExcelSheets,
  materialTransactionHasRows,
  paidExpensesInRange,
  purchaseRegisterExcelSheets,
  purchaseRegisterHasRows,
  rowsCashBankArPack,
  rowsOpsProcurementPack,
  rowsPeriodCostsInventoryPack,
} from '../lib/reportsPackRows.js';

function glBranchQuery(branchId) {
  const bid = String(branchId || '').trim();
  if (!bid) return '';
  return `&branchId=${encodeURIComponent(bid)}`;
}

export function useReportsExport({
  apiFetch,
  showToast,
  hasFinanceView,
  startDate,
  endDate,
  branchId = '',
  expenses,
  paymentRequests,
  coilLots,
  movements,
  bankReconciliation,
  ledgerEntries,
  treasuryMovements,
  quotations,
  receipts,
  productionJobs,
  refunds,
  liveProducts,
  purchaseOrders,
  accessoryUsage,
}) {
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [printLayout, setPrintLayout] = useState('landscape');
  const [printDense, setPrintDense] = useState(true);
  const [materialTxnReport, setMaterialTxnReport] = useState(null);
  const [materialTxnPrintOpen, setMaterialTxnPrintOpen] = useState(false);
  const [purchaseReport, setPurchaseReport] = useState(null);
  const [purchasePrintOpen, setPurchasePrintOpen] = useState(false);
  const getExportRows = useCallback((name) => {
      if (name === PACK_PERIOD_COSTS_INVENTORY) {
        return rowsPeriodCostsInventoryPack(expenses, paymentRequests, coilLots, movements, startDate, endDate);
      }
      if (name === PACK_CASH_BANK_AR) {
        return rowsCashBankArPack(
          bankReconciliation,
          ledgerEntries,
          treasuryMovements,
          quotations,
          receipts,
          startDate,
          endDate
        );
      }
      if (name === PACK_SALES_CUSTOMER) {
        return salesPaymentsReceivedRows(ledgerEntries, productionJobs, quotations, startDate, endDate).map((r) => ({
          reportSection: 'Payments received (period)',
          category: r.group,
          ledgerType: 'RECEIPT',
          dateISO: r.paymentDateISO,
          recordId: r.ledgerEntryId,
          customer: r.customerName,
          quotationRef: r.quotationRef,
          amountNgn: r.amountPaidNgn,
          paymentMethod: r.paymentMethod,
          remarks: r.bankReference,
        }));
      }
      if (name === PACK_REFUND_PERIOD) {
        return refundPeriodOverviewRows(refunds, ledgerEntries, startDate, endDate).map((r) => ({
          reportSection: 'Refund overview (period)',
          receiptPaymentDateISO: r.receiptPaymentDateISO,
          customerName: r.customerName,
          quotationRef: r.quotationRef,
          amountRefundPaidNgn: r.amountRefundPaidNgn,
          refundPaymentDateISO: r.refundPaymentDateISO,
          amountRefundNotPaidNgn: r.amountRefundNotPaidNgn,
          refundId: r.refundId,
          status: r.status,
          requestedAtISO: r.requestedAtISO,
        }));
      }
      if (name === PACK_OPS_PROCUREMENT) {
        return rowsOpsProcurementPack(liveProducts, purchaseOrders, coilLots, accessoryUsage, startDate, endDate);
      }
      return [];
    },
    [
      bankReconciliation,
      coilLots,
      endDate,
      expenses,
      ledgerEntries,
      liveProducts,
      movements,
      paymentRequests,
      productionJobs,
      purchaseOrders,
      quotations,
      receipts,
      refunds,
      startDate,
      treasuryMovements,
      accessoryUsage,
    ]
  );

  const getPrintConfig = useCallback(
    (name) => {
      if (name === PACK_PERIOD_COSTS_INVENTORY) {
        const exRows = buildPaidExpensePrintRows(expenses, paymentRequests, startDate, endDate);
        const acRows = accruedApprovedPayablesRows(paymentRequests, startDate, endDate);
        const val = coilInventoryValuationRows(coilLots);
        const cogs = cogsMovementRows(movements, startDate, endDate);
        return {
          title: PACK_PERIOD_COSTS_INVENTORY,
          columns: [
            { key: 'expenseID', label: 'Expense' },
            { key: 'date', label: 'Date' },
            { key: 'category', label: 'Category' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'paidAmount', label: 'Paid' },
            { key: 'remainingAmount', label: 'Remaining' },
          ],
          rows: exRows,
          grouping: {
            groupBy: 'category',
            subtotalKey: '_paidAmountNgn',
            subtotalColumnKey: 'paidAmount',
            groupLabel: 'Category',
            subtotalLabel: 'Subtotal',
            totalLabel: 'Total',
          },
          summaryLines: [
            { label: 'Print shows paid and part-paid expenses', value: String(exRows.length) },
            {
              label: 'Expenses total',
              value: formatNgn(
                exRows.reduce((s, e) => s + (Number(String(e._paidAmountNgn || 0)) + Number(String(e._remainingAmountNgn || 0))), 0)
              ),
            },
            { label: 'Paid total', value: formatNgn(exRows.reduce((s, e) => s + (Number(e._paidAmountNgn) || 0), 0)) },
            {
              label: 'Remaining balance',
              value: formatNgn(exRows.reduce((s, e) => s + (Number(e._remainingAmountNgn) || 0), 0)),
            },
            { label: 'Unpaid accrual rows', value: String(acRows.length) },
            {
              label: 'Accrual unpaid ₦',
              value: formatNgn(acRows.reduce((s, r) => s + (Number(r.accruedUnpaidNgn) || 0), 0)),
            },
            { label: 'Coil valuation lines', value: String(val.length) },
            { label: 'COGS movement lines', value: String(cogs.length) },
            { label: 'Excel', value: 'Sheets: Expenses, Accruals, Valuation, COGS.' },
          ],
        };
      }
      if (name === PACK_EXPENSES_REFUNDS) {
        const exRows = buildPaidExpensePrintRows(expenses, paymentRequests, startDate, endDate);
        const refundPaid = refundsPaidInPeriodRows(refunds, startDate, endDate);
        const expensePrintRows = exRows.map((e) => ({
          section: 'Expenses (paid)',
          date: e.date || '—',
          ref: e.expenseID || '—',
          party: e.category || '—',
          detail: e.type || '—',
          amount: e.paidAmount || formatNgn(e._paidAmountNgn || 0),
          status: Number(e._remainingAmountNgn) > 0 ? 'Part-paid' : 'Paid',
          _amountNgn: Number(e._paidAmountNgn) || 0,
        }));
        const refundPrintRows = refundPaid.map((r) => ({
          section: 'Refunds paid',
          date: r.payoutDateISO || '—',
          ref: displayDocNumber(r.refundId) || r.refundId || '—',
          party: r.customerName || '—',
          detail: displayDocNumber(r.quotationRef) || r.quotationRef || '—',
          amount: formatNgn(r.amountNgn),
          status: r.status || 'Paid',
          _amountNgn: Number(r.amountNgn) || 0,
        }));
        const rows = [...expensePrintRows, ...refundPrintRows];
        const expensePaidTotal = expensePrintRows.reduce((s, r) => s + (Number(r._amountNgn) || 0), 0);
        const refundPaidTotal = refundPrintRows.reduce((s, r) => s + (Number(r._amountNgn) || 0), 0);
        return {
          title: PACK_EXPENSES_REFUNDS,
          columns: [
            { key: 'section', label: 'Section' },
            { key: 'date', label: 'Date' },
            { key: 'ref', label: 'Ref' },
            { key: 'party', label: 'Category / Customer' },
            { key: 'detail', label: 'Type / Quotation' },
            { key: 'amount', label: 'Paid (NGN)', align: 'right' },
            { key: 'status', label: 'Status' },
          ],
          rows,
          grouping: {
            groupBy: 'section',
            subtotalKey: '_amountNgn',
            subtotalColumnKey: 'amount',
            groupLabel: 'Section',
            subtotalLabel: 'Subtotal',
            totalLabel: 'Overall paid',
          },
          summaryLines: [
            { label: 'Expense lines', value: String(expensePrintRows.length) },
            { label: 'Expenses paid', value: formatNgn(expensePaidTotal) },
            { label: 'Refund payout lines', value: String(refundPrintRows.length) },
            { label: 'Refunds paid', value: formatNgn(refundPaidTotal) },
            { label: 'Combined paid', value: formatNgn(expensePaidTotal + refundPaidTotal) },
          ],
        };
      }
      if (name === PACK_CASH_BANK_AR) {
        const br = filterBankReconciliationInRange(bankReconciliation, startDate, endDate);
        const rtExc = receiptAdvanceTreasuryReconciliationRows(
          ledgerEntries,
          treasuryMovements,
          startDate,
          endDate
        );
        const arDisc = quotationPaidNgnReceiptDiscrepancies(quotations, receipts, ledgerEntries);
        const tm = filterTreasuryMovementsInRange(treasuryMovements, startDate, endDate);
        const rows = br.map((r) => ({
          bankDate: r.bankDateISO,
          description: r.description || 'â€”',
          amount: formatNgn(r.amountNgn),
          status: r.status,
          match: r.systemMatch || 'â€”',
        }));
        return {
          title: PACK_CASH_BANK_AR,
          columns: [
            { key: 'bankDate', label: 'Bank date' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'match', label: 'System match' },
          ],
          rows,
          summaryLines: [
            { label: 'Print shows bank lines only', value: String(br.length) },
            {
              label: 'In Review (bank)',
              value: String(br.filter((x) => x.status === 'Review').length),
            },
            { label: 'Receipt/treasury exception rows', value: String(rtExc.length) },
            { label: 'AR mismatch rows', value: String(arDisc.length) },
            { label: 'Treasury movements in period', value: String(tm.length) },
            { label: 'Note', value: '0 receipt exceptions = no ±₦1 mismatches in range.' },
          ],
        };
      }
      if (name === PACK_SALES_CUSTOMER) {
        const raw = salesPaymentsReceivedRows(ledgerEntries, productionJobs, quotations, startDate, endDate);
        const s = salesPaymentsReceivedSummary(raw);
        const rows = raw.map((r) => ({
          group: r.group,
          paymentDateISO: r.paymentDateISO || 'â€”',
          customerName: r.customerName || 'â€”',
          quotationRef: displayDocNumber(r.quotationRef) || r.quotationRef || 'â€”',
          amountPaidNgn: formatNgn(r.amountPaidNgn),
          paymentMethod: r.paymentMethod || 'â€”',
          bankReference: r.bankReference || 'â€”',
          _amountPaidNgn: Number(r.amountPaidNgn) || 0,
        }));
        return {
          title: PACK_SALES_CUSTOMER,
          columns: [
            { key: 'group', label: 'Category' },
            { key: 'paymentDateISO', label: 'Payment date' },
            { key: 'customerName', label: 'Customer' },
            { key: 'quotationRef', label: 'Quotation' },
            { key: 'amountPaidNgn', label: 'Amount paid' },
            { key: 'paymentMethod', label: 'Method' },
            { key: 'bankReference', label: 'Reference' },
          ],
          rows,
          grouping: {
            groupBy: 'group',
            subtotalKey: '_amountPaidNgn',
            subtotalColumnKey: 'amountPaidNgn',
            groupLabel: 'Category',
            subtotalLabel: 'Subtotal',
            totalLabel: 'Total received',
          },
          summaryLines: [
            { label: 'Rows', value: String(s.rowCount) },
            { label: 'Total payment received', value: formatNgn(s.totalReceivedNgn) },
            { label: 'Materials produced in period', value: formatNgn(s.producedNgn) },
            { label: 'Materials not produced in period (credit)', value: formatNgn(s.notProducedNgn) },
          ],
        };
      }
      if (name === PACK_REFUND_PERIOD) {
        const raw = refundPeriodOverviewRows(refunds, ledgerEntries, startDate, endDate);
        const s = refundPeriodOverviewSummary(raw);
        const rows = raw.map((r) => ({
          receiptPaymentDateISO: r.receiptPaymentDateISO || '—',
          customerName: r.customerName || '—',
          quotationRef: displayDocNumber(r.quotationRef) || r.quotationRef || '—',
          amountRefundPaidNgn: formatNgn(r.amountRefundPaidNgn),
          refundPaymentDateISO: r.refundPaymentDateISO || '—',
          amountRefundNotPaidNgn: formatNgn(r.amountRefundNotPaidNgn),
          status: r.status || '—',
        }));
        return {
          title: PACK_REFUND_PERIOD,
          columns: [
            { key: 'receiptPaymentDateISO', label: 'Receipt payment date' },
            { key: 'customerName', label: 'Customer' },
            { key: 'quotationRef', label: 'Quotation' },
            { key: 'amountRefundPaidNgn', label: 'Refund paid' },
            { key: 'refundPaymentDateISO', label: 'Refund payment date' },
            { key: 'amountRefundNotPaidNgn', label: 'Refund not paid' },
            { key: 'status', label: 'Status' },
          ],
          rows,
          summaryLines: [
            { label: 'Rows', value: String(s.rowCount) },
            { label: 'Refund paid in period', value: formatNgn(s.refundPaidNgn) },
            { label: 'Refund not paid (outstanding)', value: formatNgn(s.refundNotPaidNgn) },
          ],
        };
      }
      if (name === PACK_OPS_PROCUREMENT) {
        const rows = liveProducts.map((p) => ({
          productID: p.productID,
          name: p.name,
          onHand: `${p.stockLevel.toLocaleString()} ${p.unit}`,
          reorderAt: `${Number(p.lowStockThreshold ?? 0).toLocaleString()} ${p.unit}`,
          flag: p.stockLevel < p.lowStockThreshold ? 'Below minimum' : 'OK',
        }));
        const grn = grnCoilRegisterRows(coilLots, startDate, endDate);
        const poBr = purchaseOrderAccrualBridgeRows(purchaseOrders);
        const accN = filterAccessoryUsageInRange(accessoryUsage, startDate, endDate).length;
        return {
          title: PACK_OPS_PROCUREMENT,
          columns: [
            { key: 'productID', label: 'SKU' },
            { key: 'name', label: 'Description' },
            { key: 'onHand', label: 'On hand' },
            { key: 'reorderAt', label: 'Reorder at' },
            { key: 'flag', label: 'Stock flag' },
          ],
          rows,
          summaryLines: [
            { label: 'Print shows SKU listing only', value: String(rows.length) },
            {
              label: 'Below reorder',
              value: String(liveProducts.filter((p) => p.stockLevel < p.lowStockThreshold).length),
            },
            { label: 'Purchase orders (Excel)', value: String(purchaseOrders.length) },
            { label: 'GRN / inventory lots in period (Excel)', value: String(grn.length) },
            { label: 'PO accrual rows (Excel)', value: String(poBr.length) },
            { label: 'Accessory usage lines in period (Excel)', value: String(accN) },
          ],
        };
      }
      return {
        title: name,
        columns: [{ key: 'info', label: 'Message' }],
        rows: [{ info: 'No A4 layout for this selection.' }],
        summaryLines: [],
      };
    },
    [
      accessoryUsage,
      bankReconciliation,
      coilLots,
      endDate,
      expenses,
      ledgerEntries,
      liveProducts,
      movements,
      paymentRequests,
      productionJobs,
      purchaseOrders,
      quotations,
      receipts,
      refunds,
      startDate,
      treasuryMovements,
    ]
  );

  const downloadMonthEndBundle = useCallback(() => {
    const packs = [
      { sheet: 'Costs_inventory', name: PACK_PERIOD_COSTS_INVENTORY },
      { sheet: 'Cash_bank_AR', name: PACK_CASH_BANK_AR },
      { sheet: 'Sales_customer', name: PACK_SALES_CUSTOMER },
      { sheet: 'Ops_procurement', name: PACK_OPS_PROCUREMENT },
    ];
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;
    for (const p of packs) {
      const rows = getExportRows(p.name);
      if (!rows.length) continue;
      const sheetName = p.sheet.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
      sheetCount += 1;
    }
    if (!sheetCount) {
      showToast('No rows in any core pack for this period.', { variant: 'info' });
      return;
    }
    XLSX.writeFile(wb, `month-end-${startDate}-to-${endDate}.xlsx`);
    showToast(`Month-end bundle downloaded (${sheetCount} sheet(s)).`);
  }, [endDate, getExportRows, showToast, startDate]);

  const downloadReport = useCallback(async (name, fmt) => {
    const packSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');

    if (name === PACK_GL_AUDIT) {
      if (!hasFinanceView) {
        showToast('General ledger pack requires finance.view.', { variant: 'info' });
        return;
      }
      const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${glBranchQuery(branchId)}`;
      const [tbRes, jRes, aRes] = await Promise.all([
        apiFetch(`/api/gl/trial-balance?${q}`),
        apiFetch(`/api/gl/journals?${q}`),
        apiFetch(`/api/gl/activity?${q}`),
      ]);
      if (!tbRes.ok || !tbRes.data?.ok) {
        showToast(tbRes.data?.error || 'Could not load trial balance.', { variant: 'error' });
        return;
      }
      if (!jRes.ok || !jRes.data?.ok) {
        showToast(jRes.data?.error || 'Could not load GL journals.', { variant: 'error' });
        return;
      }
      if (!aRes.ok || !aRes.data?.ok) {
        showToast(aRes.data?.error || 'Could not load GL activity.', { variant: 'error' });
        return;
      }
      const tb = tbRes.data;
      const jn = jRes.data;
      const act = aRes.data;
      if (fmt === 'Excel') {
        const wb = XLSX.utils.book_new();
        const tbRows = (tb.rows || []).map((r) => ({
          accountCode: r.accountCode,
          accountName: r.accountName,
          accountType: r.accountType,
          debitNgn: r.debitNgn,
          creditNgn: r.creditNgn,
          netNgn: r.netNgn,
        }));
        const jRows = (jn.journals || []).map((j) => ({
          journalId: j.journalId,
          entryDateISO: j.entryDateISO,
          periodKey: j.periodKey,
          memo: j.memo,
          sourceKind: j.sourceKind,
          sourceId: j.sourceId,
          totalDebitNgn: j.totalDebitNgn,
          totalCreditNgn: j.totalCreditNgn,
        }));
        const aRows = (act.lines || []).map((l) => ({
          entryDateISO: l.entryDateISO,
          journalId: l.journalId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          debitNgn: l.debitNgn,
          creditNgn: l.creditNgn,
          lineMemo: l.lineMemo,
          journalMemo: l.journalMemo,
          sourceKind: l.sourceKind,
          sourceId: l.sourceId,
          costCenter: l.costCenter || '',
        }));
        if (tbRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tbRows), 'Trial_balance');
        if (jRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jRows), 'Journals');
        if (aRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aRows), 'Activity');
        XLSX.writeFile(wb, `${packSlug}.xlsx`);
        showToast(`${name} exported as Excel (3 sheets).`);
        return;
      }
      const flat = [
        ...(tb.rows || []).map((r) => ({
          packSection: 'Trial_balance',
          accountCode: r.accountCode,
          accountName: r.accountName,
          debitNgn: r.debitNgn,
          creditNgn: r.creditNgn,
          netNgn: r.netNgn,
        })),
        ...(jn.journals || []).map((j) => ({
          packSection: 'Journals',
          journalId: j.journalId,
          entryDateISO: j.entryDateISO,
          memo: j.memo,
          totalDebitNgn: j.totalDebitNgn,
          totalCreditNgn: j.totalCreditNgn,
        })),
        ...(act.lines || []).map((l) => ({
          packSection: 'Activity',
          entryDateISO: l.entryDateISO,
          accountCode: l.accountCode,
          debitNgn: l.debitNgn,
          creditNgn: l.creditNgn,
          lineMemo: l.lineMemo,
        })),
      ];
      if (!flat.length) {
        showToast('No GL data in the selected period.', { variant: 'info' });
        return;
      }
      downloadRows(name, flat, fmt);
      showToast(`${name} exported as ${fmt}.`);
      return;
    }

    if (name === PACK_PERIOD_COSTS_INVENTORY && fmt === 'Excel') {
      const ex = paidExpensesInRange(expenses, paymentRequests, startDate, endDate);
      const ac = accruedApprovedPayablesRows(paymentRequests, startDate, endDate);
      const val = coilInventoryValuationRows(coilLots);
      const cogs = cogsMovementRows(movements, startDate, endDate);
      if (!ex.length && !ac.length && !val.length && !cogs.length) {
        showToast('No rows for this pack in the selected range.', { variant: 'info' });
        return;
      }
      const wb = XLSX.utils.book_new();
      if (ex.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ex), 'Expenses');
      if (ac.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ac), 'Accruals');
      if (val.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(val), 'Valuation');
      if (cogs.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cogs), 'COGS');
      XLSX.writeFile(wb, `${packSlug}.xlsx`);
      showToast(`${name} exported as Excel (multi-sheet).`);
      return;
    }

    if (name === PACK_CASH_BANK_AR && fmt === 'Excel') {
      const bank = filterBankReconciliationInRange(bankReconciliation, startDate, endDate);
      const rt = receiptAdvanceTreasuryReconciliationRows(ledgerEntries, treasuryMovements, startDate, endDate);
      const ar = quotationPaidNgnReceiptDiscrepancies(quotations, receipts, ledgerEntries);
      const tm = filterTreasuryMovementsInRange(treasuryMovements, startDate, endDate);
      if (!bank.length && !rt.length && !ar.length && !tm.length) {
        showToast('No rows for this pack in the selected range.', { variant: 'info' });
        return;
      }
      const wb = XLSX.utils.book_new();
      if (bank.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bank), 'Bank_recon');
      if (rt.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rt), 'Receipt_treasury');
      if (ar.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ar), 'AR_check');
      if (tm.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tm), 'Treasury');
      XLSX.writeFile(wb, `${packSlug}.xlsx`);
      showToast(`${name} exported as Excel (multi-sheet).`);
      return;
    }

    if (name === PACK_SALES_CUSTOMER && fmt === 'Excel') {
      const rows = salesPaymentsReceivedRows(ledgerEntries, productionJobs, quotations, startDate, endDate).map((r) => ({
        category: r.group,
        paymentDateISO: r.paymentDateISO,
        customerName: r.customerName,
        quotationRef: r.quotationRef,
        amountPaidNgn: r.amountPaidNgn,
        paymentMethod: r.paymentMethod,
        bankReference: r.bankReference,
        ledgerEntryId: r.ledgerEntryId,
      }));
      if (!rows.length) {
        showToast('No rows for this pack in the selected range.', { variant: 'info' });
        return;
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sales_report');
      XLSX.writeFile(wb, `${packSlug}.xlsx`);
      showToast(`${name} exported as Excel.`);
      return;
    }

    if (name === PACK_REFUND_PERIOD && fmt === 'Excel') {
      const rows = refundPeriodOverviewRows(refunds, ledgerEntries, startDate, endDate).map((r) => ({
        receiptPaymentDateISO: r.receiptPaymentDateISO,
        customerName: r.customerName,
        quotationRef: r.quotationRef,
        amountRefundPaidNgn: r.amountRefundPaidNgn,
        refundPaymentDateISO: r.refundPaymentDateISO,
        amountRefundNotPaidNgn: r.amountRefundNotPaidNgn,
        refundId: r.refundId,
        status: r.status,
        requestedAtISO: r.requestedAtISO,
      }));
      if (!rows.length) {
        showToast('No rows for this pack in the selected range.', { variant: 'info' });
        return;
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Refund_report');
      XLSX.writeFile(wb, `${packSlug}.xlsx`);
      showToast(`${name} exported as Excel.`);
      return;
    }

    if (name === PACK_OPS_PROCUREMENT && fmt === 'Excel') {
      const grn = grnCoilRegisterRows(coilLots, startDate, endDate);
      const poBr = purchaseOrderAccrualBridgeRows(purchaseOrders);
      const invFlat = liveProducts.map((p) => ({
        productID: p.productID,
        name: p.name,
        stockLevel: p.stockLevel,
        unit: p.unit,
        lowStockThreshold: p.lowStockThreshold,
      }));
      const poFlat = purchaseOrders.map((p) => ({
        poID: p.poID,
        procurementKind: procurementKindFromPo(p),
        supplierName: p.supplierName,
        orderDateISO: p.orderDateISO,
        status: p.status,
        lineCount: p.lines?.length || 0,
        supplierPaidNgn: p.supplierPaidNgn || 0,
      }));
      const accUsage = filterAccessoryUsageInRange(accessoryUsage, startDate, endDate).map((u) => ({
        jobID: u.jobID,
        quotationRef: u.quotationRef,
        quoteLineId: u.quoteLineId,
        name: u.name,
        orderedQty: u.orderedQty,
        suppliedQty: u.suppliedQty,
        inventoryProductId: u.inventoryProductId || '',
        postedAtISO: u.postedAtISO,
      }));
      if (!invFlat.length && !poFlat.length && !grn.length && !poBr.length && !accUsage.length) {
        showToast('No rows for this pack.', { variant: 'info' });
        return;
      }
      const wb = XLSX.utils.book_new();
      if (invFlat.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invFlat), 'Inventory');
      if (poFlat.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poFlat), 'POs');
      if (grn.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grn), 'GRN_lots');
      if (poBr.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poBr), 'PO_accrual');
      if (accUsage.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accUsage), 'Acc_usage');
      XLSX.writeFile(wb, `${packSlug}.xlsx`);
      showToast(`${name} exported as Excel (multi-sheet).`);
      return;
    }

    if (name === PACK_MATERIAL_EXCEPTIONS) {
      const [lossRes, agingRes, reconRes] = await Promise.all([
        apiFetch('/api/material-incidents/reports/loss'),
        apiFetch('/api/material-incidents/reports/aging'),
        apiFetch('/api/material-incidents/reports/reconciliation'),
      ]);
      if (!lossRes.ok || !agingRes.ok || !reconRes.ok) {
        showToast('Could not load material exception reports.', { variant: 'error' });
        return;
      }
      const lossRows = (lossRes.data?.rows || []).map((r) => ({
        section: 'Loss_by_type',
        incidentType: r.incidentType,
        reasonCode: r.reasonCode,
        kgDeducted: r.kgDeducted,
        totalMeters: r.totalMeters,
        count: r.count,
      }));
      const agingRows = (agingRes.data?.rows || []).map((r) => ({
        section: 'Offcut_aging',
        id: r.id,
        incidentType: r.incidentType,
        gaugeLabel: r.gaugeLabel,
        colour: r.colour,
        metersAvailable: r.metersAvailable,
        ageDays: r.ageDays,
        dateISO: r.dateISO,
      }));
      const recon = reconRes.data || {};
      const reconRows = [
        {
          section: 'Pool_reconciliation',
          incidentMeters: recon.incidentMetersAvailable,
          legacyMeters: recon.legacyPoolMetersAvailable,
          totalMeters: recon.totalMetersAvailable,
          openIncidents: recon.openIncidentCount,
        },
        ...(recon.bySpec || []).map((s) => ({
          section: 'By_spec',
          materialFamily: s.materialFamily,
          gaugeLabel: s.gaugeLabel,
          colour: s.colour,
          profileLabel: s.profileLabel,
          metersAvailable: s.metersAvailable,
          incidentCount: s.incidentCount,
        })),
      ];
      const flat = [...lossRows, ...agingRows, ...reconRows];
      if (!flat.length) {
        showToast('No material exception data for this branch.', { variant: 'info' });
        return;
      }
      if (fmt === 'Excel') {
        const wb = XLSX.utils.book_new();
        if (lossRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lossRows), 'Loss');
        if (agingRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agingRows), 'Aging');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reconRows), 'Reconciliation');
        XLSX.writeFile(wb, `${packSlug}.xlsx`);
        showToast(`${name} exported as Excel (multi-sheet).`);
        return;
      }
      downloadRows(name, flat, fmt);
      showToast(`${name} exported as ${fmt}.`);
      return;
    }

    if (name === PACK_MATERIAL_TRANSACTION) {
      const res = await fetchMaterialTransactionReport(apiFetch, startDate, endDate);
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
      const sheets = materialTransactionExcelSheets(res.report);
      if (!materialTransactionHasRows(res.report)) {
        showToast('No material transactions in the selected range.', { variant: 'info' });
        return;
      }
      if (fmt === 'Excel') {
        const wb = XLSX.utils.book_new();
        for (const s of sheets) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name.slice(0, 31));
        }
        XLSX.writeFile(wb, `${packSlug}.xlsx`);
        showToast(`${name} exported as Excel (${sheets.length} sheets).`);
        return;
      }
      const flat = sheets.flatMap((s) => s.rows.map((row) => ({ sheet: s.name, ...row })));
      downloadRows(name, flat, fmt);
      showToast(`${name} exported as ${fmt}.`);
      return;
    }

    if (name === PACK_PURCHASE_REGISTER) {
      const res = await fetchPurchaseRegisterReport(apiFetch, startDate, endDate);
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
      const sheets = purchaseRegisterExcelSheets(res.report);
      if (!purchaseRegisterHasRows(res.report)) {
        showToast('No purchase receipts in the selected range.', { variant: 'info' });
        return;
      }
      if (fmt === 'Excel') {
        const wb = XLSX.utils.book_new();
        for (const s of sheets) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name.slice(0, 31));
        }
        XLSX.writeFile(wb, `${packSlug}.xlsx`);
        showToast(`${name} exported as Excel (${sheets.length} sheets).`);
        return;
      }
      const flat = sheets.flatMap((s) => s.rows.map((row) => ({ sheet: s.name, ...row })));
      downloadRows(name, flat, fmt);
      showToast(`${name} exported as ${fmt}.`);
      return;
    }

    const rows = getExportRows(name);
    if (!rows.length) {
      showToast(`No rows for ${name.toLowerCase()} in the selected range.`, { variant: 'info' });
      return;
    }
    downloadRows(name, rows, fmt);
    showToast(`${name} exported as ${fmt}.`);
  }, [
    accessoryUsage,
    apiFetch,
    bankReconciliation,
    branchId,
    coilLots,
    endDate,
    expenses,
    getExportRows,
    hasFinanceView,
    ledgerEntries,
    liveProducts,
    movements,
    paymentRequests,
    productionJobs,
    purchaseOrders,
    quotations,
    receipts,
    refunds,
    showToast,
    startDate,
    treasuryMovements,
  ]);

  const openPrintSheet = useCallback(async (name) => {
    setPrintLayout('landscape');
    setPrintDense(true);
    if (name === PACK_GL_AUDIT) {
      if (!hasFinanceView) {
        showToast('General ledger pack requires finance.view.', { variant: 'info' });
        return;
      }
      const { ok, data } = await apiFetch(
        `/api/gl/trial-balance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${glBranchQuery(branchId)}`
      );
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Could not load trial balance.', { variant: 'error' });
        return;
      }
      const rows = (data.rows || []).map((r) => ({
        account: `${r.accountCode} — ${r.accountName}`,
        debit: formatNgn(r.debitNgn),
        credit: formatNgn(r.creditNgn),
        net: formatNgn(r.netNgn),
      }));
      setPrintPayload({
        title: PACK_GL_AUDIT,
        columns: [
          { key: 'account', label: 'Account' },
          { key: 'debit', label: 'Debit' },
          { key: 'credit', label: 'Credit' },
          { key: 'net', label: 'Net' },
        ],
        rows,
        summaryLines: [
          { label: 'Print', value: 'Trial balance only (compact)' },
          { label: 'Period', value: `${data.startDate} → ${data.endDate}` },
          { label: 'Total debit', value: formatNgn(data.totals?.debitNgn ?? 0) },
          { label: 'Total credit', value: formatNgn(data.totals?.creditNgn ?? 0) },
          { label: 'Excel pack', value: 'Includes journal register + full line detail.' },
        ],
      });
      setPrintOpen(true);
      return;
    }
    if (name === PACK_MATERIAL_TRANSACTION) {
      const res = await fetchMaterialTransactionReport(apiFetch, startDate, endDate);
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
      if (!materialTransactionHasRows(res.report)) {
        showToast('No material transactions in the selected range.', { variant: 'info' });
        return;
      }
      setMaterialTxnReport(res.report);
      setMaterialTxnPrintOpen(true);
      return;
    }
    if (name === PACK_PURCHASE_REGISTER) {
      const res = await fetchPurchaseRegisterReport(apiFetch, startDate, endDate);
      if (!res.ok) {
        showToast(res.error, { variant: 'error' });
        return;
      }
      if (!purchaseRegisterHasRows(res.report)) {
        showToast('No purchase receipts in the selected range.', { variant: 'info' });
        return;
      }
      setPurchaseReport(res.report);
      setPurchasePrintOpen(true);
      return;
    }
    const cfg = getPrintConfig(name);
    setPrintPayload(cfg);
    setPrintOpen(true);
  }, [apiFetch, branchId, endDate, getPrintConfig, hasFinanceView, showToast, startDate]);

  const runApiWorkbook = useCallback(
    (workbook) => {
      if (workbook === 'sales') {
        void downloadStandardSalesWorkbook(apiFetch, startDate, endDate, showToast);
        return;
      }
      if (workbook === 'finance') {
        void downloadStandardFinanceWorkbook(apiFetch, startDate, endDate, showToast);
        return;
      }
      if (workbook === 'purchases') {
        void downloadStandardPurchasesWorkbook(apiFetch, startDate, endDate, showToast);
        return;
      }
      if (workbook === 'stock') {
        void downloadStandardStockWorkbook(apiFetch, endDate, showToast);
      }
    },
    [apiFetch, endDate, showToast, startDate]
  );

  const handlePackPrint = useCallback(
    (pack) => {
      if (pack === PACK_GL_AUDIT && !hasFinanceView) {
        showToast('General ledger pack requires finance.view.', { variant: 'info' });
        return;
      }
      void openPrintSheet(pack);
    },
    [hasFinanceView, openPrintSheet, showToast]
  );

  const handlePackDownload = useCallback(
    (pack, fmt, locked) => {
      if (locked) {
        showToast('This export needs the finance.view permission.', { variant: 'info' });
        return;
      }
      void downloadReport(pack, fmt);
    },
    [downloadReport, showToast]
  );

  return {
    printOpen,
    setPrintOpen,
    printPayload,
    setPrintPayload,
    printLayout,
    printDense,
    materialTxnReport,
    setMaterialTxnReport,
    materialTxnPrintOpen,
    setMaterialTxnPrintOpen,
    purchaseReport,
    setPurchaseReport,
    purchasePrintOpen,
    setPurchasePrintOpen,
    downloadMonthEndBundle,
    runApiWorkbook,
    handlePackPrint,
    handlePackDownload,
  };
}
