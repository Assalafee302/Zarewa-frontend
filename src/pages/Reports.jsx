import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel } from '../components/layout';
import { ReportPrintModal } from '../components/reports/ReportPrintModal';
import { useToast } from '../context/ToastContext';
import { useInventory } from '../context/InventoryContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { ReportsFinanceToolsPanel } from '../components/reports/ReportsFinanceToolsPanel.jsx';
import { ReportsOversightPanel } from '../components/reports/ReportsOversightPanel.jsx';
import { StockRegisterPanel } from '../components/reports/StockRegisterPanel.jsx';
import { MaterialTransactionPrintModal } from '../components/reports/MaterialTransactionPrintModal.jsx';
import { PurchaseReportPrintModal } from '../components/reports/PurchaseReportPrintModal.jsx';
import { ReportsExportSection } from '../components/reports/ReportsExportSection.jsx';
import { ReportsPeriodPanel } from '../components/reports/ReportsPeriodPanel.jsx';
import { startOfMonthYmd, ymdLocal } from '../lib/reportsExportCatalog.js';
import { userMayViewAccountingSectionsOnReportsClient } from '../lib/financeDeskAccess.js';
import {
  userMayViewAp2SupplierDiagnosticsClient,
  userMayViewAp3CostingReadinessClient,
} from '../lib/financeTrialExceptionsAccess.js';
import { useReportsSnapshot } from '../hooks/useReportsSnapshot.js';
import { useReportsExport } from '../hooks/useReportsExport.js';

const PANEL = 'z-panel-section';
const SUBHDR = 'z-section-title mb-4';

const Reports = () => {
  const { show: showToast } = useToast();
  const { movements, products: liveProducts } = useInventory();
  const ws = useWorkspace();

  const [startDate, setStartDate] = useState(startOfMonthYmd);
  const [endDate, setEndDate] = useState(ymdLocal);

  const {
    countOnlyOverview,
    aggregateSummary,
    summaryErr,
    expenses,
    paymentRequests,
    coilLots,
    bankReconciliation,
    ledgerEntries,
    treasuryMovements,
    quotations,
    receipts,
    productionJobs,
    refunds,
    purchaseOrders,
    accessoryUsage,
    salesKpis,
    paymentExceptionQueue,
    openPaymentExceptionQueue,
    exceptionClosureNotes,
    toggleExceptionClosed,
    updateExceptionNote,
  } = useReportsSnapshot(ws, startDate, endDate);

  const {
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
  } = useReportsExport({
    apiFetch,
    showToast,
    hasFinanceView: ws.hasPermission('finance.view'),
    startDate,
    endDate,
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
  });

  const periodLabel = useMemo(() => `Period ${startDate} → ${endDate}`, [endDate, startDate]);

  const showAccountingSections =
    ws.hasPermission('finance.view') &&
    userMayViewAccountingSectionsOnReportsClient(ws?.session?.user?.roleKey, ws?.session?.user?.permissions);

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
        subtitle="Set the report period, review KPIs, and export audit workbooks or workspace packs. Finance tools and oversight sections expand on demand."
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
          {countOnlyOverview ? (
            <div className={`${PANEL} border-teal-100/80 bg-teal-50/30`}>
              <h3 className={SUBHDR}>Branch summary</h3>
              <p className="text-sm font-medium text-slate-600 mb-4">
                Entity counts for your branch. Detailed exports require Sales, Procurement, Operations, or Finance access.
              </p>
              {summaryErr ? <p className="text-sm font-semibold text-red-600 mb-3">{summaryErr}</p> : null}
              {!aggregateSummary && !summaryErr ? (
                <p className="text-sm font-medium text-slate-500">Loading summary…</p>
              ) : null}
              {aggregateSummary ? (
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
              ) : null}
            </div>
          ) : (
            <>
              <ReportsPeriodPanel
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                salesKpis={salesKpis}
                onDownloadMonthEndBundle={downloadMonthEndBundle}
              />

              <ReportsFinanceToolsPanel
                visible={showAccountingSections}
                startDate={startDate}
                endDate={endDate}
                hasFinanceView={ws.hasPermission('finance.view')}
                showToast={showToast}
                branchScopeLabel={
                  ws.viewAllBranches
                    ? 'All branches (HQ roll-up)'
                    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || ''
                }
                mayViewAp2={userMayViewAp2SupplierDiagnosticsClient(
                  ws?.session?.user?.roleKey,
                  ws?.session?.user?.permissions
                )}
                mayViewAp3={userMayViewAp3CostingReadinessClient(
                  ws?.session?.user?.roleKey,
                  ws?.session?.user?.permissions
                )}
              />

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

              <ReportsExportSection
                hasFinanceView={ws.hasPermission('finance.view')}
                onPrint={handlePackPrint}
                onDownload={handlePackDownload}
                onApiWorkbook={runApiWorkbook}
              />

              <ReportsOversightPanel
                showToast={showToast}
                paymentExceptionQueue={paymentExceptionQueue}
                openExceptionCount={openPaymentExceptionQueue.length}
                closureNotes={exceptionClosureNotes}
                onToggleClosed={toggleExceptionClosed}
                onUpdateNote={updateExceptionNote}
              />
            </>
          )}
        </div>
      </MainPanel>
    </PageShell>
  );
};

export default Reports;
