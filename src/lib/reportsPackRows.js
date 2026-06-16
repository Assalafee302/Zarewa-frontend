import { formatNgn } from '../Data/mockData';
import {
  accruedApprovedPayablesRows,
  coilInventoryValuationRows,
  cogsMovementRows,
  filterAccessoryUsageInRange,
  filterBankReconciliationInRange,
  filterExpensesInRange,
  filterTreasuryMovementsInRange,
  grnCoilRegisterRows,
  purchaseOrderAccrualBridgeRows,
  quotationPaidNgnReceiptDiscrepancies,
  receiptAdvanceTreasuryReconciliationRows,
} from './liveAnalytics';
import { procurementKindFromPo } from './procurementPoKind';
import * as XLSX from 'xlsx';
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
export {
  rowsPeriodCostsInventoryPack,
  paidExpensesInRange,
  buildPaidExpensePrintRows,
  rowsCashBankArPack,
  rowsOpsProcurementPack,
  materialTransactionExcelSheets,
  materialTransactionHasRows,
  fetchMaterialTransactionReport,
  purchaseRegisterExcelSheets,
  purchaseRegisterHasRows,
  fetchPurchaseRegisterReport,
  downloadRows,
};
