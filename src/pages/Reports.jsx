import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Factory, FileSpreadsheet, Landmark, Printer, Receipt, Scale, Table2 } from 'lucide-react';
import { PageHeader, PageShell, MainPanel } from '../components/layout';
import { ReportPrintModal } from '../components/reports/ReportPrintModal';
import { formatNgn } from '../Data/mockData';
import { useToast } from '../context/ToastContext';
import { useInventory } from '../context/InventoryContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
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
  filterExpensesInRange,
  filterQuotationsInRange,
  filterTreasuryMovementsInRange,
  grnCoilRegisterRows,
  liveReceivablesNgn,
  productionAttributedRevenueNgn,
  productionOutputDateISO,
  paymentReconciliationExceptionQueue,
  refundPeriodOverviewRows,
  refundPeriodOverviewSummary,
  purchaseOrderAccrualBridgeRows,
  quotationPaidNgnReceiptDiscrepancies,
  receiptAdvanceTreasuryReconciliationRows,
  salesPaymentsReceivedRows,
  salesPaymentsReceivedSummary,
} from '../lib/liveAnalytics';
import { procurementKindFromPo } from '../lib/procurementPoKind';
import { ReportsGlPilotSection } from '../components/reports/ReportsGlPilotSection.jsx';
import { ReportsFinanceReconciliationPackSection } from '../components/reports/ReportsFinanceReconciliationPackSection.jsx';
import { userMayViewAccountingSectionsOnReportsClient } from '../lib/financeDeskAccess.js';
import { ExecutiveReportPacksSection } from '../components/reports/ExecutiveReportPacksSection.jsx';
import { StockRegisterPanel } from '../components/reports/StockRegisterPanel.jsx';
import { MaterialTransactionPrintModal } from '../components/reports/MaterialTransactionPrintModal.jsx';
import { PurchaseReportPrintModal } from '../components/reports/PurchaseReportPrintModal.jsx';

const PACK_PERIOD_COSTS_INVENTORY = 'Period costs & inventory (pack)';
const PACK_CASH_BANK_AR = 'Cash, bank & AR reconciliation (pack)';
const PACK_GL_AUDIT = 'General ledger audit (period)';
const PACK_SALES_CUSTOMER = 'Sales report';
const PACK_REFUND_PERIOD = 'Refund report';
const PACK_OPS_PROCUREMENT = 'Operations & procurement (pack)';
const PACK_MATERIAL_TRANSACTION = 'Material transaction register';
const PACK_PURCHASE_REGISTER = 'Purchase register';
const PACK_MATERIAL_EXCEPTIONS = 'Material exceptions (offcut)';

function rowsPeriodCostsInventoryPack(expenses, paymentRequests, coilLots, movements, startDate, endDate) {
  const rows = [];
  paidExpensesInRange(expenses, paymentRequests, startDate, endDate).forEach((e) => {
    rows.push({
      packSection: 'Expenses',
      expenseID: e.expenseID,
      date: e.date,
      category: e.category,
      expenseType: e.expenseType,
      amountNgn: e.amountNgn,
      paymentMethod: e.paymentMethod,
      reference: e.reference,
      branchId: e.branchId,
    });
  });
  accruedApprovedPayablesRows(paymentRequests, startDate, endDate).forEach((r) => {
    rows.push({ packSection: 'Accruals', ...r });
  });
  coilInventoryValuationRows(coilLots).forEach((r) => {
    rows.push({ packSection: 'Valuation', ...r });
  });
  cogsMovementRows(movements, startDate, endDate).forEach((r) => {
    rows.push({ packSection: 'COGS_movement', ...r });
  });
  return rows;
}

function normalizeExpenseTypeLabel(expenseType, paymentStatus) {
  const raw = String(expenseType || '').trim();
  if (!raw) return '—';
  if (paymentStatus === 'paid') {
    return raw.replace(/\(pending payout\)/gi, '(paid out)');
  }
  return raw;
}

function paidExpensesInRange(expenses = [], paymentRequests = [], startDate, endDate) {
  const inRange = filterExpensesInRange(expenses, startDate, endDate);
  const requestsByExpense = new Map();
  for (const req of paymentRequests || []) {
    const expenseID = String(req?.expenseID || '').trim();
    if (!expenseID) continue;
    const requested = Number(req.amountRequestedNgn) || 0;
    const paid = Number(req.paidAmountNgn) || 0;
    const approved = String(req.approvalStatus || '').trim() === 'Approved';
    const rejected = String(req.approvalStatus || '').trim() === 'Rejected';
    const fullyPaid = requested > 0 && paid >= requested;
    const hasAnyPayout = paid > 0;
    const existing = requestsByExpense.get(expenseID);
    const next = {
      approved,
      rejected,
      fullyPaid,
      hasAnyPayout,
      paidAmountNgn: paid,
      requestedAmountNgn: requested,
    };
    if (!existing) {
      requestsByExpense.set(expenseID, next);
      continue;
    }
    requestsByExpense.set(expenseID, {
      approved: existing.approved || next.approved,
      rejected: existing.rejected || next.rejected,
      fullyPaid: existing.fullyPaid || next.fullyPaid,
      hasAnyPayout: existing.hasAnyPayout || next.hasAnyPayout,
      paidAmountNgn: Math.max(Number(existing.paidAmountNgn) || 0, Number(next.paidAmountNgn) || 0),
      requestedAmountNgn: Math.max(Number(existing.requestedAmountNgn) || 0, Number(next.requestedAmountNgn) || 0),
    });
  }
  return inRange
    .filter((ex) => {
      const expenseID = String(ex?.expenseID || '').trim();
      const req = expenseID ? requestsByExpense.get(expenseID) : null;
      if (!req) return true;
      if (req.rejected) return false;
      return req.approved && req.hasAnyPayout;
    })
    .map((ex) => {
      const expenseID = String(ex?.expenseID || '').trim();
      const req = expenseID ? requestsByExpense.get(expenseID) : null;
      const totalAmount = Number(ex.amountNgn) || 0;
      const paidAmountNgn = req ? Math.max(0, Math.min(Number(req.paidAmountNgn) || 0, totalAmount)) : totalAmount;
      const remainingAmountNgn = Math.max(0, totalAmount - paidAmountNgn);
      return {
        ...ex,
        expenseType: normalizeExpenseTypeLabel(ex.expenseType, req?.fullyPaid ? 'paid' : ''),
        paidAmountNgn,
        remainingAmountNgn,
      };
    });
}

function buildPaidExpensePrintRows(expenses = [], paymentRequests = [], startDate, endDate) {
  const formatExpenseDateShort = (value) => {
    const iso = String(value || '').slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return String(value || '—');
    const [, yy, mm, dd] = m;
    return `${dd}/${mm}/${yy.slice(-2)}`;
  };
  const compactExpenseId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const m = /(\d+)$/.exec(raw);
    return m ? m[1] : raw;
  };
  const expenseDescription = (expense) => {
    const options = [
      expense?.description,
      expense?.note,
      expense?.reason,
      expense?.expenseType,
      expense?.category,
    ];
    const first = options.find((v) => String(v || '').trim());
    return first ? String(first).trim() : '—';
  };
  const rows = paidExpensesInRange(expenses, paymentRequests, startDate, endDate)
    .map((e) => ({
      expenseID: compactExpenseId(e.expenseID),
      date: formatExpenseDateShort(e.date),
      category: e.category || 'Uncategorized',
      type: expenseDescription(e),
      amount: (Number(e.amountNgn) || 0).toLocaleString('en-NG'),
      paidAmount: (Number(e.paidAmountNgn) || 0).toLocaleString('en-NG'),
      remainingAmount: formatNgn(e.remainingAmountNgn),
      _paidAmountNgn: Number(e.paidAmountNgn) || 0,
      _remainingAmountNgn: Number(e.remainingAmountNgn) || 0,
    }))
    .sort((a, b) => {
      const c = String(a.category).localeCompare(String(b.category));
      if (c !== 0) return c;
      const d = String(a.date).localeCompare(String(b.date));
      if (d !== 0) return d;
      return String(a.expenseID).localeCompare(String(b.expenseID));
    });

  let lastCategory = '';
  return rows.map((row) => {
    const category = row.category;
    const showCategory = category !== lastCategory;
    lastCategory = category;
    return {
      ...row,
      category: showCategory ? category : '',
    };
  });
}

function rowsCashBankArPack(
  bankReconciliation,
  ledgerEntries,
  treasuryMovements,
  quotations,
  receipts,
  startDate,
  endDate
) {
  const rows = [];
  filterBankReconciliationInRange(bankReconciliation, startDate, endDate).forEach((r) => {
    rows.push({
      packSection: 'Bank_recon',
      bankDateISO: r.bankDateISO,
      id: r.id,
      description: r.description,
      amountNgn: r.amountNgn,
      systemMatch: r.systemMatch,
      status: r.status,
      branchId: r.branchId,
    });
  });
  receiptAdvanceTreasuryReconciliationRows(ledgerEntries, treasuryMovements, startDate, endDate).forEach((r) => {
    rows.push({
      packSection: 'Receipt_treasury_exceptions',
      section: r.section,
      ledgerEntryId: r.ledgerEntryId || '',
      atISO: r.atISO || r.postedAtISO || '',
      customerName: r.customerName || '',
      quotationRef: r.quotationRef || '',
      ledgerAmountNgn: r.ledgerAmountNgn,
      treasuryNetNgn: r.treasuryNetNgn,
      deltaNgn: r.deltaNgn,
      issue: r.issue || '',
    });
  });
  quotationPaidNgnReceiptDiscrepancies(quotations, receipts, ledgerEntries).forEach((r) => {
    rows.push({
      packSection: 'AR_paid_vs_receipts',
      quotationID: r.quotationID,
      dateISO: r.dateISO,
      customer: r.customer,
      totalNgn: r.totalNgn,
      paidNgnOnQuote: r.paidNgnOnQuote,
      receiptPaidNgn: r.receiptPaidNgn,
      advanceAppliedNgn: r.advanceAppliedNgn,
      expectedPaidNgn: r.expectedPaidNgn,
      deltaNgn: r.deltaNgn,
    });
  });
  filterTreasuryMovementsInRange(treasuryMovements, startDate, endDate).forEach((m) => {
    rows.push({
      packSection: 'Treasury_movements',
      postedAtISO: m.postedAtISO,
      type: m.type,
      accountType: m.accountType,
      accountName: m.accountName,
      amountNgn: m.amountNgn,
      sourceKind: m.sourceKind,
      sourceId: m.sourceId,
      reference: m.reference,
    });
  });
  return rows;
}

function rowsOpsProcurementPack(liveProducts, purchaseOrders, coilLots, accessoryUsage, startDate, endDate) {
  const rows = [];
  liveProducts.forEach((p) => {
    rows.push({
      packSection: 'Inventory_SKUs',
      productID: p.productID,
      name: p.name,
      stockLevel: p.stockLevel,
      unit: p.unit,
      lowStockThreshold: p.lowStockThreshold,
    });
  });
  purchaseOrders.forEach((p) => {
    rows.push({
      packSection: 'Purchase_orders',
      poID: p.poID,
      procurementKind: procurementKindFromPo(p),
      supplierName: p.supplierName,
      orderDateISO: p.orderDateISO,
      status: p.status,
      lineCount: p.lines?.length || 0,
      supplierPaidNgn: p.supplierPaidNgn || 0,
    });
  });
  grnCoilRegisterRows(coilLots, startDate, endDate).forEach((r) => {
    rows.push({ packSection: 'GRN_register', ...r });
  });
  purchaseOrderAccrualBridgeRows(purchaseOrders).forEach((r) => {
    rows.push({ packSection: 'PO_accrual_bridge', ...r });
  });
  filterAccessoryUsageInRange(accessoryUsage, startDate, endDate).forEach((u) => {
    rows.push({
      packSection: 'Production_accessory_usage',
      jobID: u.jobID,
      quotationRef: u.quotationRef,
      quoteLineId: u.quoteLineId,
      name: u.name,
      orderedQty: u.orderedQty,
      suppliedQty: u.suppliedQty,
      inventoryProductId: u.inventoryProductId || '',
      postedAtISO: u.postedAtISO,
    });
  });
  return rows;
}

/** Three finance packs + GL; two operational packs under “More”. */
const PRIMARY_REPORT_GROUPS = [
  {
    id: 'accounting-pl',
    title: 'Costs, accruals & inventory',
    subtitle:
      'Single export: expenses in range, unpaid approved accruals, inventory-lot valuation (coil & stone GRNs), and COGS movements (Excel = one sheet per section).',
    reports: [
      {
        id: 'period-costs-inventory',
        title: PACK_PERIOD_COSTS_INVENTORY,
        desc: 'Management accounts inputs — was: expenses, accrued payables, valuation & COGS.',
        icon: Receipt,
        formats: ['Excel', 'CSV'],
      },
    ],
  },
  {
    id: 'reconciliation',
    title: 'Bank, treasury & AR',
    subtitle:
      'Single export: bank statement lines, receipt/advance vs treasury exceptions, AR control list, and treasury movements in the period.',
    reports: [
      {
        id: 'cash-bank-ar',
        title: PACK_CASH_BANK_AR,
        desc: 'Was: bank recon, receipt vs treasury, AR check, financial (treasury) listing.',
        icon: Landmark,
        formats: ['Excel', 'CSV'],
      },
    ],
  },
  {
    id: 'audit-gl',
    title: 'General ledger',
    subtitle:
      'Trial balance, journal register, and full line detail in one Excel file. Print preview is trial balance only.',
    reports: [
      {
        id: 'gl-audit-pack',
        title: PACK_GL_AUDIT,
        desc: 'Was: TB, journal register, and line-level GL activity.',
        icon: Scale,
        formats: ['Excel', 'CSV'],
        requiresFinanceView: true,
      },
    ],
  },
];

const MORE_OPERATIONAL_REPORTS = [
  {
    id: 'sales-customer-pack',
    title: PACK_SALES_CUSTOMER,
    desc: 'All payments received in period (quotation receipts only), grouped by materials produced vs not produced within period.',
    icon: Table2,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'refund-period-report',
    title: PACK_REFUND_PERIOD,
    desc: 'Refund paid and unpaid analysis for selected period, with quotation and customer visibility.',
    icon: Table2,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'ops-procurement-pack',
    title: PACK_OPS_PROCUREMENT,
    desc: 'SKU stock, purchase orders (with procurement kind), GRN/lot register, PO accrual bridge, production accessory postings in period.',
    icon: Factory,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'material-transaction-register',
    title: PACK_MATERIAL_TRANSACTION,
    desc: 'Material activity in period with summary totals by material and gauge, observations, aluminium/aluzinc/stone detail, accessories, not produced, and cancelled.',
    icon: Table2,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'purchase-register',
    title: PACK_PURCHASE_REGISTER,
    desc: 'GRN purchases in period by material and gauge: coil kg, stone metres, accessories; supplier payments and PO outstanding.',
    icon: Table2,
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'material-exceptions-pack',
    title: PACK_MATERIAL_EXCEPTIONS,
    desc: 'Loss by type, offcut aging (open pool metres), and pool reconciliation (incident + legacy buckets).',
    icon: Table2,
    formats: ['Excel', 'CSV'],
  },
];

function coilTxnToExport(r, family, gauge) {
    return {
    section: family,
    gauge: gauge || r.gauge,
    date: r.txnDateDisplay || r.txnDate,
    quotation: r.qtNoDisplay,
    customerProject: r.customerProject,
    colour: r.colour,
    coilNo: r.coilNoDisplay,
    beforeKg: r.beforeKg,
    afterKg: r.afterKg,
    kgUsed: r.kgUsed,
    design: r.design,
    metres: r.meters,
    conversionKgM: r.conversionKgM ?? '',
        offcutKg: r.offcutKg ?? '',
        remark: r.remark ?? '',
        paidNetNgn: r.amountNetNgn ?? '',
    attributedNgn: r.attributedNgn ?? '',
    jobId: r.jobId,
  };
}

function materialTransactionSummaryExcelRows(summary) {
  if (!summary) return [];
  const rows = [];
  for (const m of summary.byMaterial || []) {
    rows.push({
      rowType: 'Material',
      section: m.label,
      lines: m.lineCount,
      kgUsed: m.kgUsed ?? '',
      metres: m.metres ?? '',
      offcutKg: m.offcutKg ?? '',
      qtyIssued: m.qtyIssued ?? '',
      paidNetNgn: m.paidNetNgn ?? '',
    });
  }
  for (const g of summary.byGauge || []) {
    rows.push({
      rowType: 'Gauge',
      material: g.material,
      gauge: g.gaugeLabel,
      lines: g.lineCount,
      kgUsed: g.kgUsed ?? '',
      metres: g.metres ?? '',
      avgKgM: g.avgKgM ?? '',
      stoneMetresUsed: g.metresUsed ?? '',
    });
  }
  for (const t of summary.observations || []) {
    rows.push({ rowType: 'Observation', text: t });
  }
  for (const t of summary.recommendations || []) {
    rows.push({ rowType: 'Recommendation', text: t });
  }
  const n = summary.notes || {};
  rows.push({
    rowType: 'Notes',
    coilBalanceGaps: n.balanceGapCount ?? 0,
    stoneGaps: n.stoneGapCount ?? 0,
    notProduced: n.notProducedCount ?? 0,
    cancelled: n.cancelledCount ?? 0,
    newCoilLines: n.newCoilCount ?? 0,
    finishedCoilLines: n.finishedCoilCount ?? 0,
  });
  return rows;
}

function materialTransactionExcelSheets(report) {
  if (!report) return [];
  const sheets = [];
  const summaryRows = materialTransactionSummaryExcelRows(report.summary);
  const pushCoil = (name, section, familyLabel) => {
    const rows = [];
    for (const g of section?.groups || []) {
      for (const r of g.rows) rows.push(coilTxnToExport(r, familyLabel, g.gaugeLabel));
    }
    if (rows.length) sheets.push({ name, rows });
  };
  pushCoil('Aluminium', report.aluminium, 'Aluminium');
  pushCoil('Aluzinc', report.aluzinc, 'Aluzinc');
  pushCoil('Coil_unclassified', report.unclassifiedCoil, 'Coil_unclassified');
  if (report.offcutProduction?.rows?.length) {
    sheets.push({
      name: 'Offcut_production',
      rows: report.offcutProduction.rows.map((r) => ({
        date: r.txnDateDisplay || r.txnDate,
        quotation: r.qtNoDisplay,
        customerProject: r.customerProject,
        design: r.design,
        metres: r.metres,
        kgUsed: r.kgUsed,
        paidNetNgn: r.amountNetNgn ?? '',
      })),
    });
  }
  const stoneRows = [];
  for (const g of report.stoneCoated?.groups || []) {
    for (const r of g.rows) {
      stoneRows.push({
        gauge: g.gaugeLabel,
        date: r.txnDateDisplay || r.txnDate,
        quotation: r.qtNoDisplay,
        customerProject: r.customerProject,
        colour: r.colour,
        design: r.design,
        beforeM: r.beforeM,
        metresUsed: r.metresUsed,
        afterM: r.afterM,
        paidNetNgn: r.amountNetNgn ?? '',
      });
    }
  }
  if (stoneRows.length) sheets.push({ name: 'Stone_coated', rows: stoneRows });
  const accRows = [];
  for (const g of report.accessories?.groups || []) {
    for (const r of g.rows) {
      accRows.push({
        section: g.typeLabel,
        date: r.txnDateDisplay || r.txnDate,
        quotation: r.qtNoDisplay,
        customerProject: r.customerProject,
        item: r.itemName,
        qtyIssued: r.qtyUsed,
        unit: r.unit,
      });
    }
  }
  if (accRows.length) sheets.push({ name: 'Accessories', rows: accRows });
  const cancelled = (report.cancelled?.coil || []).map((r) => ({
    date: r.txnDateDisplay || r.txnDate,
    quotation: r.qtNoDisplay,
    customerProject: r.customerProject,
    coilNo: r.coilNoDisplay,
    gauge: r.gauge,
    status: 'Cancelled',
  }));
  if (cancelled.length) sheets.push({ name: 'Cancelled', rows: cancelled });
  const notProduced = (report.listedNotProduced?.rows || []).map((r) => ({
    listedDate: r.txnDateDisplay || r.txnDate,
    quotation: r.qtNoDisplay,
    customerProject: r.customerProject,
    design: r.design,
    status: r.status,
    plannedM: r.plannedMeters,
    machine: r.machineName,
    jobId: r.jobId,
  }));
  if (notProduced.length) sheets.push({ name: 'Listed_not_produced', rows: notProduced });
  if (summaryRows.length) sheets.push({ name: 'Summary', rows: summaryRows });
  return sheets;
}

function materialTransactionHasRows(report) {
  if (!report) return false;
  if (report.summary?.byMaterial?.length) return true;
  if (report.offcutProduction?.rows?.length) return true;
  if (report.stoneCoated?.groups?.length) return true;
  if (report.listedNotProduced?.rows?.length) return true;
  return materialTransactionExcelSheets(report).some((s) => s.rows.length > 0);
}

async function fetchMaterialTransactionReport(apiFetch, startDate, endDate) {
  const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const { ok, data } = await apiFetch(`/api/reports/material-transaction?${q}`);
  if (!ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Could not load material transaction report.' };
  }
  return { ok: true, report: data.report };
}

function coilPurchaseExport(r, material, gauge) {
  return {
    section: material,
    gauge: gauge || r.gauge,
    date: r.txnDateDisplay || r.txnDate,
    supplier: r.supplier,
    coilNo: r.coilNoDisplay,
    colour: r.colour,
    po: r.poIdDisplay,
    receivedKg: r.receivedKg,
    orderKg: r.orderKg ?? '',
    kgAmountNgn: r.kgAmountNgn ?? '',
    totalNgn: r.totalNgn ?? '',
    poPaidNgn: r.poPaidNgn ?? '',
    poOutstandingNgn: r.poOutstandingNgn ?? '',
    remark: r.remark ?? '',
  };
}

function qtyPurchaseExport(r, material, groupLabel) {
  return {
    section: material,
    group: groupLabel,
    date: r.txnDateDisplay || r.txnDate,
    supplier: r.supplier,
    ref: r.coilNoDisplay,
    item: r.productName,
    po: r.poIdDisplay,
    received: r.receivedQty,
    unit: r.unitLabel,
    ordered: r.orderQty ?? '',
    unitPriceNgn: r.kgAmountNgn ?? '',
    totalNgn: r.totalNgn ?? '',
    poPaidNgn: r.poPaidNgn ?? '',
    poOutstandingNgn: r.poOutstandingNgn ?? '',
    remark: r.remark ?? '',
  };
}

function purchaseSummaryExcelRows(report) {
  const summary = report?.summary;
  if (!summary) return [];
  const rows = [];
  for (const m of summary.byMaterial || []) {
    rows.push({
      rowType: 'Material',
      section: m.label,
      lines: m.lineCount,
      received: m.received,
      unit: m.receivedUnit,
      valueNgn: m.totalValueNgn,
    });
  }
  for (const g of summary.byGauge || []) {
    rows.push({
      rowType: 'Gauge',
      material: g.material,
      gauge: g.gaugeLabel,
      lines: g.lineCount,
      received: g.received,
      unit: g.receivedUnit,
      valueNgn: g.totalValueNgn,
    });
  }
  for (const t of summary.observations || []) rows.push({ rowType: 'Observation', text: t });
  for (const t of summary.recommendations || []) rows.push({ rowType: 'Recommendation', text: t });
  const p = summary.payments || {};
  rows.push({
    rowType: 'Payments',
    receivedValueNgn: p.receivedValueNgn ?? 0,
    paidInPeriodNgn: p.paidInPeriodNgn ?? 0,
    poOutstandingNgn: p.poOutstandingNgn ?? 0,
  });
  return rows;
}

function purchaseRegisterExcelSheets(report) {
  if (!report) return [];
  const sheets = [];
  const summaryRows = purchaseSummaryExcelRows(report);

  const pushCoil = (name, section, label) => {
    const rows = [];
    for (const g of section?.groups || []) {
      for (const r of g.rows) rows.push(coilPurchaseExport(r, label, g.gaugeLabel));
    }
    if (rows.length) sheets.push({ name, rows });
  };
  pushCoil('Aluminium', report.aluminium, 'Aluminium');
  pushCoil('Aluzinc', report.aluzinc, 'Aluzinc');
  pushCoil('Coil_unclassified', report.unclassifiedCoil, 'Coil_unclassified');

  const stoneRows = [];
  for (const g of report.stoneCoated?.groups || []) {
    for (const r of g.rows) stoneRows.push(qtyPurchaseExport(r, 'Stone', g.gaugeLabel));
  }
  if (stoneRows.length) sheets.push({ name: 'Stone_coated', rows: stoneRows });

  const accRows = [];
  for (const g of report.accessories?.groups || []) {
    for (const r of g.rows) accRows.push(qtyPurchaseExport(r, 'Accessories', g.typeLabel));
  }
  if (accRows.length) sheets.push({ name: 'Accessories', rows: accRows });
  if (summaryRows.length) sheets.push({ name: 'Summary', rows: summaryRows });
  return sheets;
}

function purchaseRegisterHasRows(report) {
  if (!report) return false;
  if (report.summary?.byMaterial?.length) return true;
  return purchaseRegisterExcelSheets(report).some((s) => s.rows.length > 0);
}

async function fetchPurchaseRegisterReport(apiFetch, startDate, endDate) {
  const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const { ok, data } = await apiFetch(`/api/reports/purchase-register?${q}`);
  if (!ok || !data?.ok) {
    return { ok: false, error: data?.error || 'Could not load purchase register report.' };
  }
  return { ok: true, report: data.report };
}

const PANEL = 'z-panel-section';
const SUBHDR = 'z-section-title mb-4';

function downloadRows(name, rows, fmt) {
  const safe = name.toLowerCase().replace(/\s+/g, '-');
  if (!rows.length) return;

  if (fmt === 'Excel') {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Report');
    XLSX.writeFile(wb, `${safe}.xlsx`);
    return;
  }

  const sep = ',';
  const header = Object.keys(rows[0] || {});
  const lines = [header.join(sep)];
  rows.forEach((row) => {
    lines.push(
      header
        .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
        .join(sep)
    );
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const Reports = () => {
  const { show: showToast } = useToast();
  const { movements, products: liveProducts } = useInventory();
  const ws = useWorkspace();
  const [aggregateSummary, setAggregateSummary] = useState(null);
  const [summaryErr, setSummaryErr] = useState(null);

  const countOnlyOverview =
    ws.hasPermission('reports.view') &&
    !ws.canAccessModule('sales') &&
    !ws.canAccessModule('procurement') &&
    !ws.canAccessModule('operations') &&
    !ws.canAccessModule('finance');

  useEffect(() => {
    if (!countOnlyOverview || !ws.hasWorkspaceData) return undefined;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/reports/summary');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setSummaryErr(data?.error || 'Could not load summary');
        setAggregateSummary(null);
        return;
      }
      setAggregateSummary(data.counts);
      setSummaryErr(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [countOnlyOverview, ws.hasWorkspaceData, ws.refreshEpoch]);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState(today);
  const snapshot = ws?.snapshot ?? {};
  const quotations = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.quotations) ? snapshot.quotations : []),
    [snapshot.quotations, ws.hasWorkspaceData]
  );
  const receipts = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.receipts) ? snapshot.receipts : []),
    [snapshot.receipts, ws.hasWorkspaceData]
  );
  const expenses = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.expenses) ? snapshot.expenses : []),
    [snapshot.expenses, ws.hasWorkspaceData]
  );
  const purchaseOrders = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.purchaseOrders) ? snapshot.purchaseOrders : []),
    [snapshot.purchaseOrders, ws.hasWorkspaceData]
  );
  const treasuryMovements = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.treasuryMovements) ? snapshot.treasuryMovements : []),
    [snapshot.treasuryMovements, ws.hasWorkspaceData]
  );
  const ledgerEntries = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.ledgerEntries) ? snapshot.ledgerEntries : []),
    [snapshot.ledgerEntries, ws.hasWorkspaceData]
  );
  const productionJobs = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.productionJobs) ? snapshot.productionJobs : []),
    [snapshot.productionJobs, ws.hasWorkspaceData]
  );
  const refunds = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.refunds) ? snapshot.refunds : []),
    [snapshot.refunds, ws.hasWorkspaceData]
  );
  const bankReconciliation = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.bankReconciliation) ? snapshot.bankReconciliation : [],
    [snapshot.bankReconciliation, ws.hasWorkspaceData]
  );
  const coilLots = useMemo(
    () => (ws?.hasWorkspaceData && Array.isArray(snapshot.coilLots) ? snapshot.coilLots : []),
    [snapshot.coilLots, ws.hasWorkspaceData]
  );
  const paymentRequests = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.paymentRequests) ? snapshot.paymentRequests : [],
    [snapshot.paymentRequests, ws.hasWorkspaceData]
  );
  const accessoryUsage = useMemo(
    () =>
      ws?.hasWorkspaceData && Array.isArray(snapshot.productionJobAccessoryUsage)
        ? snapshot.productionJobAccessoryUsage
        : [],
    [snapshot.productionJobAccessoryUsage, ws.hasWorkspaceData]
  );

  const salesKpis = useMemo(() => {
    const quotes = filterQuotationsInRange(quotations, startDate, endDate);
    const quotationPipelineNgn = quotes.reduce((s, q) => s + (q.totalNgn ?? 0), 0);
    const producedSalesNgn = productionAttributedRevenueNgn(quotations, productionJobs, startDate, endDate);
    const totalPaid = receipts
      .filter((r) => r.dateISO >= startDate && r.dateISO <= endDate)
      .reduce((s, q) => s + (q.amountNgn ?? 0), 0);
    const outstanding = liveReceivablesNgn(quotations, ledgerEntries, productionJobs);
    const productionJobsCompletedInRange = productionJobs.filter((j) => {
      if (String(j.status || '').trim() !== 'Completed') return false;
      const iso = productionOutputDateISO(j);
      if (!iso) return false;
      return (!startDate || iso >= startDate) && (!endDate || iso <= endDate);
    }).length;
    return {
      quotationPipelineNgn,
      producedSalesNgn,
      totalPaid,
      outstanding,
      rowCount: quotes.length,
      productionJobsCompletedInRange,
    };
  }, [endDate, ledgerEntries, productionJobs, quotations, receipts, startDate]);

  const periodLabel = useMemo(() => `Period ${startDate} → ${endDate}`, [endDate, startDate]);

  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [printLayout, setPrintLayout] = useState('portrait');
  const [printDense, setPrintDense] = useState(false);
  const [materialTxnReport, setMaterialTxnReport] = useState(null);
  const [materialTxnPrintOpen, setMaterialTxnPrintOpen] = useState(false);
  const [purchaseReport, setPurchaseReport] = useState(null);
  const [purchasePrintOpen, setPurchasePrintOpen] = useState(false);
  const [exceptionClosureNotes, setExceptionClosureNotes] = useState({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('reports.paymentExceptionClosureNotes');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setExceptionClosureNotes(parsed);
    } catch {
      // ignore invalid cache and start clean
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('reports.paymentExceptionClosureNotes', JSON.stringify(exceptionClosureNotes));
    } catch {
      // ignore storage write failures
    }
  }, [exceptionClosureNotes]);

  const paymentExceptionQueue = useMemo(
    () =>
      paymentReconciliationExceptionQueue(
        ledgerEntries,
        treasuryMovements,
        quotations,
        receipts,
        startDate,
        endDate
      ),
    [endDate, ledgerEntries, quotations, receipts, startDate, treasuryMovements]
  );
  const openPaymentExceptionQueue = useMemo(
    () => paymentExceptionQueue.filter((row) => !exceptionClosureNotes[row.key]?.closed),
    [exceptionClosureNotes, paymentExceptionQueue]
  );

  const toggleExceptionClosed = useCallback((row, closed) => {
    setExceptionClosureNotes((prev) => ({
      ...prev,
      [row.key]: {
        ...prev[row.key],
        closed: Boolean(closed),
        closedAtISO: closed ? new Date().toISOString() : null,
      },
    }));
  }, []);

  const updateExceptionNote = useCallback((row, note) => {
    setExceptionClosureNotes((prev) => ({
      ...prev,
      [row.key]: {
        ...prev[row.key],
        note,
      },
    }));
  }, []);

  const getExportRows = useCallback(
    (name) => {
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
          description: r.description || '—',
          amount: formatNgn(r.amountNgn),
          status: r.status,
          match: r.systemMatch || '—',
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
          paymentDateISO: r.paymentDateISO || '—',
          customerName: r.customerName || '—',
          quotationRef: displayDocNumber(r.quotationRef) || r.quotationRef || '—',
          amountPaidNgn: formatNgn(r.amountPaidNgn),
          paymentMethod: r.paymentMethod || '—',
          bankReference: r.bankReference || '—',
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

  const downloadReport = async (name, fmt) => {
    const packSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');

    if (name === PACK_GL_AUDIT) {
      if (!ws.hasPermission('finance.view')) {
        showToast('General ledger pack requires finance.view.', { variant: 'info' });
        return;
      }
      const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
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
  };

  const openPrintSheet = async (name) => {
    setPrintLayout('portrait');
    setPrintDense(false);
    if (name === PACK_GL_AUDIT) {
      if (!ws.hasPermission('finance.view')) {
        showToast('General ledger pack requires finance.view.', { variant: 'info' });
        return;
      }
      const { ok, data } = await apiFetch(
        `/api/gl/trial-balance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
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
  };

  return (
    <PageShell>
      <MaterialTransactionPrintModal
        open={materialTxnPrintOpen && !!materialTxnReport}
        onClose={() => {
          setMaterialTxnPrintOpen(false);
          setMaterialTxnReport(null);
        }}
        report={materialTxnReport}
        branchLabel={ws.branchLabel || ws.branchId}
        periodLabel={periodLabel}
      />

      <PurchaseReportPrintModal
        open={purchasePrintOpen && !!purchaseReport}
        onClose={() => {
          setPurchasePrintOpen(false);
          setPurchaseReport(null);
        }}
        report={purchaseReport}
        branchLabel={ws.branchLabel || ws.branchId}
        periodLabel={periodLabel}
      />

      <ReportPrintModal
        isOpen={printOpen && !!printPayload}
        onClose={() => {
          setPrintOpen(false);
          setPrintPayload(null);
        }}
        title={printPayload?.title ?? 'Report'}
        periodLabel={periodLabel}
        columns={printPayload?.columns ?? []}
        rows={printPayload?.rows ?? []}
        summaryLines={printPayload?.summaryLines ?? []}
        grouping={printPayload?.grouping ?? null}
        layout={printLayout}
        denseSingleLine={printDense}
      />

      <PageHeader
        title="Reports"
        subtitle="Period dashboards plus consolidated export packs (costs, cash/AR, GL, sales, operations). Expand “More” for the material transaction register (alu/aluzinc by gauge, stone, accessories, cancelled, other movements)."
      />
      {ws.hasPermission('exec.dashboard.view') ? (
        <p className="text-sm font-medium text-slate-600 -mt-4 mb-6 sm:-mt-6 sm:mb-8 max-w-2xl leading-relaxed">
          <Link to="/exec" className="font-bold text-teal-800 underline-offset-2 hover:underline">
            Executive overview
          </Link>{' '}
          — org-wide counts and approval queues (refunds, payment requests, payroll sign-off, bank reconciliation).
        </p>
      ) : null}

      <MainPanel className="!p-0 min-w-0 overflow-x-auto sm:!p-0">
        <div className="p-4 sm:p-8 space-y-10 min-w-0">
        {countOnlyOverview && (
          <div className={`${PANEL} border-teal-100/80 bg-teal-50/30`}>
            <h3 className={SUBHDR}>Count-only overview</h3>
            <p className="text-sm font-medium text-slate-600 mb-4">
              Branch-scoped totals for your role. Detailed exports need Sales, Procurement, Operations, or Finance
              access.
            </p>
            {summaryErr && <p className="text-sm font-semibold text-red-600 mb-3">{summaryErr}</p>}
            {!aggregateSummary && !summaryErr && (
              <p className="text-sm font-medium text-slate-500">Loading summary…</p>
            )}
            {aggregateSummary && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Customers', aggregateSummary.customersTotal],
                  ['Quotations', aggregateSummary.quotationsTotal],
                  ['Receipts', aggregateSummary.receiptsTotal],
                  ['Purchase orders', aggregateSummary.purchaseOrdersTotal],
                  ['Deliveries', aggregateSummary.deliveriesTotal],
                  ['Cutting lists', aggregateSummary.cuttingListsTotal],
                  ['Ledger lines', aggregateSummary.ledgerEntriesTotal],
                  ['Refunds', aggregateSummary.refundsTotal],
                  ['Expenses', aggregateSummary.expensesTotal],
                  ['Products (SKUs)', aggregateSummary.productsTotal],
                  ['Suppliers', aggregateSummary.suppliersTotal],
                  ['Treasury movements', aggregateSummary.treasuryMovementsTotal],
                ].map(([label, n]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-100 bg-white/90 px-3 py-2.5 shadow-sm"
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-black text-[#134e4a] tabular-nums mt-0.5">{Number(n) || 0}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!countOnlyOverview && (
        <>
        <div className="z-page-hero !mb-0">
          <div className="max-w-4xl">
            <h3 className={SUBHDR}>Report period</h3>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rep-start" className="z-field-label">
                    Start date
                  </label>
                  <input
                    id="rep-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="z-input"
                  />
                </div>
                <div>
                  <label htmlFor="rep-end" className="z-field-label">
                    End date
                  </label>
                  <input
                    id="rep-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="z-input"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed -mt-2">
                Most exports below filter by these dates (see each description).{' '}
                <span className="font-semibold text-slate-700">Quotation totals</span> are pipeline only — not revenue or
                sales. <span className="font-semibold text-slate-700">Sales</span> here means quotation value attributed
                when cutting lists are dated in the period (metre share). Cash receipts are period cash, not the same as
                sales.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadMonthEndBundle()} className="z-btn-primary !text-[11px]">
                  Download month-end bundle (Excel)
                </button>
                <span className="text-[10px] text-slate-500 self-center">
                  One workbook: costs &amp; inventory, cash/bank/AR, sales &amp; customer, operations &amp; procurement.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Quotation pipeline (quote date)
                  </p>
                  <p className="text-xl font-black text-[#134e4a] tabular-nums">
                    {formatNgn(salesKpis.quotationPipelineNgn)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">{salesKpis.rowCount} quotations · not sales</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Revenue at production completion
                  </p>
                  <p className="text-xl font-black text-teal-800 tabular-nums">
                    {formatNgn(salesKpis.producedSalesNgn)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {salesKpis.productionJobsCompletedInRange} job(s) completed in range
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Receipts (cash in period)
                  </p>
                  <p className="text-xl font-black text-emerald-700 tabular-nums">{formatNgn(salesKpis.totalPaid)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Receivables outstanding (Policy v1)
                  </p>
                  <p className="text-xl font-black text-amber-700 tabular-nums">{formatNgn(salesKpis.outstanding)}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Post-production balance due only · not quotation-date order book
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {ws.hasPermission('finance.view') &&
        userMayViewAccountingSectionsOnReportsClient(
          ws?.session?.user?.roleKey,
          ws?.session?.user?.permissions
        ) ? (
          <>
            <p className="text-sm font-medium text-slate-600 mb-4 -mt-2 max-w-2xl">
              GL and cash confirmation packs also live on{' '}
              <Link to="/accounting" className="font-bold text-teal-800 underline-offset-2 hover:underline">
                Accounting Desk
              </Link>
              . Cashier roles should use Cashier Desk for receipt confirmation.
            </p>
            <ReportsFinanceReconciliationPackSection
              endDate={endDate}
              hasFinanceView={ws.hasPermission('finance.view')}
              showToast={showToast}
              branchScopeLabel={
                ws.viewAllBranches
                  ? 'All branches (HQ roll-up)'
                  : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || ''
              }
            />
            <ReportsGlPilotSection
              startDate={startDate}
              endDate={endDate}
              hasFinanceView={ws.hasPermission('finance.view')}
              showToast={showToast}
            />
          </>
        ) : null}

        {ws.hasPermission('reports.view') ? (
          <StockRegisterPanel
            roleMode="reports"
            endDate={endDate}
            branchId={ws.viewAllBranches ? '' : ws.branchScope || ws.session?.currentBranchId || ''}
            branchLabel={
              ws.viewAllBranches
                ? ''
                : (ws.snapshot?.branches || []).find(
                    (b) => String(b.id || b.branchId) === String(ws.branchScope || ws.session?.currentBranchId)
                  )?.name || ws.branchScope
            }
            showToast={showToast}
            roleKey={ws.session?.user?.roleKey}
          />
        ) : null}

        <div className="space-y-0">
          <h3 className="z-section-title mb-2">Standard reports (audit)</h3>
          <p className="text-sm font-medium text-slate-600 mb-4 max-w-2xl leading-relaxed">
            Receipts register (bank account), production revenue, AR as-at, sales bridge, expenses + refunds, purchases
            (received / ordered / paid), and coil stock as-at end date. IDs use compact numbers; production print uses
            A4 landscape.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {[
              {
                id: 'std-sales',
                title: 'Sales workbook (Excel)',
                desc: 'Production revenue, receipts register, AR as-at and bridge checks.',
                run: () => downloadStandardSalesWorkbook(apiFetch, startDate, endDate, showToast),
                printTarget: PACK_SALES_CUSTOMER,
              },
              {
                id: 'std-finance',
                title: 'Expenses & refunds (Excel)',
                desc: 'Expenses period lines and approved refund trail in one workbook.',
                run: () => downloadStandardFinanceWorkbook(apiFetch, startDate, endDate, showToast),
                printTarget: PACK_PERIOD_COSTS_INVENTORY,
              },
              {
                id: 'std-purchases',
                title: 'Purchases 3 cuts (Excel)',
                desc: 'Ordered, received and paid purchase views grouped for audit checks.',
                run: () => downloadStandardPurchasesWorkbook(apiFetch, startDate, endDate, showToast),
                printTarget: PACK_OPS_PROCUREMENT,
              },
              {
                id: 'std-stock',
                title: 'Stock as-at end date (Excel)',
                desc: 'Inventory position snapshot using the selected end date.',
                run: () => downloadStandardStockWorkbook(apiFetch, endDate, showToast),
                printTarget: PACK_OPS_PROCUREMENT,
              },
            ].map((report) => (
              <div key={report.id} className="z-soft-panel p-6 sm:p-7 transition-all hover:border-teal-100/80">
                <h4 className="text-lg font-black text-[#134e4a] tracking-tight">{report.title}</h4>
                <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{report.desc}</p>
                <div className="z-form-actions !mt-5 !pt-0 !border-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openPrintSheet(report.printTarget)}
                    className="z-btn-secondary min-w-0 flex-1 justify-center sm:min-w-[10rem]"
                    title={`A4 print preview — ${report.title}`}
                  >
                    <Printer size={16} />
                    Print sheet
                  </button>
                  <button type="button" onClick={report.run} className="z-btn-primary min-w-0">
                    <FileSpreadsheet size={14} />
                    Excel
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="z-section-title mb-2">Exports &amp; print</h3>
          <p className="text-sm font-medium text-slate-600 mb-8 max-w-2xl leading-relaxed">
            Consolidated packs: each Excel file uses multiple sheets where needed. The operations pack includes
            procurement kind on POs, GRN/inventory lots (coil and stone), and accessory usage lines for the period.
            Print shows a focused table plus counts for the rest (full detail stays in Excel/CSV).
          </p>

          <ExecutiveReportPacksSection showToast={showToast} />

          <section className="z-soft-panel p-5 sm:p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-black text-[#134e4a] tracking-tight">Payment exception triage queue</h4>
              <p className="text-xs font-semibold text-slate-500">
                Open {openPaymentExceptionQueue.length} / Total {paymentExceptionQueue.length}
              </p>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Prioritize by severity, then delta and aging. Mark rows closed after reversal/re-post verification so Finance and Sales
              track unresolved risk.
            </p>
            <div className="mt-4 space-y-3">
              {paymentExceptionQueue.length === 0 ? (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                  No payment exceptions for the selected date range.
                </p>
              ) : (
                paymentExceptionQueue.slice(0, 12).map((row) => {
                  const closure = exceptionClosureNotes[row.key] || {};
                  const closed = Boolean(closure.closed);
                  return (
                    <div
                      key={row.key}
                      className={`rounded-lg border p-3 ${closed ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/60'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          {row.refId || '—'} · {row.bucket === 'quotation_ar' ? 'AR mismatch' : 'Receipt/Treasury'}
                        </p>
                        <p className="text-xs font-black text-rose-800">{formatNgn(Math.abs(Number(row.deltaNgn) || 0))}</p>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1">{row.issue}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {row.customer || '—'} {row.quotationRef ? `· ${row.quotationRef}` : ''} · Severity {row.severity}
                        {row.ageDays != null ? ` · ${row.ageDays} day(s)` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExceptionClosed(row, !closed)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                            closed
                              ? 'border-emerald-300 text-emerald-800 bg-emerald-100'
                              : 'border-rose-300 text-rose-800 bg-white'
                          }`}
                        >
                          {closed ? 'Closed' : 'Mark closed'}
                        </button>
                        <input
                          type="text"
                          value={closure.note || ''}
                          onChange={(e) => updateExceptionNote(row, e.target.value)}
                          placeholder="Closure note (reversed, reposted, verified...)"
                          className="flex-1 min-w-[14rem] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {PRIMARY_REPORT_GROUPS.map((grp, gi) => (
            <section
              key={grp.id}
              className={`space-y-5 ${gi > 0 ? 'pt-10 mt-10 border-t border-slate-200/90' : ''}`}
            >
              <header className="max-w-3xl">
                <h4 className="text-lg font-black text-[#134e4a] tracking-tight">{grp.title}</h4>
                <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{grp.subtitle}</p>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {grp.reports.map((r) => {
                  const Icon = r.icon;
                  const financeLocked = r.requiresFinanceView && !ws.hasPermission('finance.view');
                  const runPrint = () => {
                    if (financeLocked) {
                      showToast('This report needs the finance.view permission.', { variant: 'info' });
                      return;
                    }
                    openPrintSheet(r.title);
                  };
                  const runDownload = (fmt) => {
                    if (financeLocked) {
                      showToast('This export needs the finance.view permission.', { variant: 'info' });
                      return;
                    }
                    downloadReport(r.title, fmt);
                  };
                  return (
                    <div
                      key={r.id}
                      className={`z-soft-panel p-6 sm:p-7 transition-all hover:border-teal-100/80 ${
                        financeLocked ? 'opacity-[0.88]' : ''
                      }`}
                    >
                      {financeLocked && (
                        <p className="text-xs font-bold text-amber-800 mb-3 rounded-lg bg-amber-50 border border-amber-100/80 px-3 py-2">
                          Requires finance.view to export or print
                        </p>
                      )}
                      <div className="flex items-start gap-4 mb-5">
                        <div className="p-3 rounded-2xl bg-white text-[#134e4a] border border-slate-100 shadow-sm shrink-0">
                          <Icon size={22} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-[#134e4a] tracking-tight">{r.title}</h3>
                          <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{r.desc}</p>
                        </div>
                      </div>
                      <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap">
                        <button
                          type="button"
                          onClick={runPrint}
                          className="z-btn-secondary min-w-0 flex-1 justify-center sm:min-w-[10rem]"
                          title={`A4 print preview — ${r.title}`}
                        >
                          <Printer size={16} />
                          Print sheet
                        </button>
                        {r.formats.map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => runDownload(fmt)}
                            className="z-btn-primary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
                            title={`Generate ${fmt} for ${r.title}`}
                          >
                            <FileSpreadsheet size={14} />
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="mt-12 space-y-4">
            <header className="max-w-3xl">
              <h4 className="text-lg font-black text-[#134e4a] tracking-tight">More operational exports</h4>
              <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">
                Day-to-day operations and supporting registers. Same date range as above unless the report notes
                otherwise.
              </p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {MORE_OPERATIONAL_REPORTS.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.id}
                    className="z-soft-panel p-6 sm:p-7 transition-all hover:border-teal-100/80 bg-white"
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div className="p-3 rounded-2xl bg-white text-[#134e4a] border border-slate-100 shadow-sm shrink-0">
                        <Icon size={22} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-[#134e4a] tracking-tight">{r.title}</h3>
                        <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                    <div className="z-form-actions !mt-0 !pt-0 !border-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPrintSheet(r.title)}
                        className="z-btn-secondary min-w-0 flex-1 justify-center sm:min-w-[10rem]"
                        title={`A4 print preview — ${r.title}`}
                      >
                        <Printer size={16} />
                        Print sheet
                      </button>
                      {r.formats.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => downloadReport(r.title, fmt)}
                          className="z-btn-primary min-w-0 flex-1 justify-center sm:min-w-[9rem]"
                          title={`Generate ${fmt} for ${r.title}`}
                        >
                          <FileSpreadsheet size={14} />
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        </>
        )}
        </div>
      </MainPanel>
    </PageShell>
  );
};

export default Reports;
