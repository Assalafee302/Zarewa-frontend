import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, PageShell, MainPanel, PageTabs } from '../components/layout';
import { ReportPrintModal } from '../components/reports/ReportPrintModal';
import { useToast } from '../context/ToastContext';
import { useInventory } from '../context/InventoryContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { MaterialTransactionPrintModal } from '../components/reports/MaterialTransactionPrintModal.jsx';
import { PurchaseReportPrintModal } from '../components/reports/PurchaseReportPrintModal.jsx';
import { ReportsPeriodBar } from '../components/reports/ReportsPeriodBar.jsx';
import { ReportsExportCatalog } from '../components/reports/ReportsExportCatalog.jsx';
import { ReportsKpiStrip } from '../components/reports/ReportsKpiStrip.jsx';
import { ReportsMonthEndPanel } from '../components/reports/ReportsMonthEndPanel.jsx';
import { ReportsStockStatusCard } from '../components/reports/ReportsStockStatusCard.jsx';
import { ReportsExceptionsAlert, ReportsRelatedLinks } from '../components/reports/ReportsRelatedLinks.jsx';
import { ReportsConfirmExportDialog } from '../components/reports/ReportsConfirmExportDialog.jsx';
import { PaymentExceptionQueuePanel } from '../components/reports/PaymentExceptionQueuePanel.jsx';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal.jsx';
import { ExecutiveReportPacksSection } from '../components/reports/ExecutiveReportPacksSection.jsx';
import {
  REPORT_JOBS,
  defaultReportsJob,
  flattenExportCatalog,
  formatPeriodLabel,
  loadLastDownloadMap,
  loadRecentExportIds,
  loadStoredPeriodRange,
  loadStoredStockBranchId,
  markDownloadAt,
  pushRecentExportId,
  saveStoredPeriodRange,
  saveStoredStockBranchId,
  startOfMonthYmd,
  ymdLocal,
} from '../lib/reportsExportCatalog.js';
import { userMayViewAccountingSectionsOnReportsClient } from '../lib/financeDeskAccess.js';
import { useReportsSnapshot } from '../hooks/useReportsSnapshot.js';
import { useReportsExport } from '../hooks/useReportsExport.js';
import { useStockRegisterStatus } from '../hooks/useStockRegisterStatus.js';
import { userMayAccessExecutiveCommandCentreClient } from '../lib/reportsAccess.js';

const PANEL = 'z-panel-section';
const SUBHDR = 'z-section-title mb-4';

const JOB_TABS = [
  { id: REPORT_JOBS.close, label: 'Close the month' },
  { id: REPORT_JOBS.export, label: 'Downloads' },
  { id: REPORT_JOBS.stock, label: 'Stock' },
  { id: REPORT_JOBS.exceptions, label: 'Exceptions' },
];

function resolveJobFromSearch(searchParams, roleKey, openExceptionCount) {
  const raw = searchParams.get('job') || searchParams.get('tab');
  if (raw === 'operational' || raw === 'exceptions') return REPORT_JOBS.exceptions;
  if (raw === 'stock') return REPORT_JOBS.stock;
  if (raw === 'export' || raw === 'downloads') return REPORT_JOBS.export;
  if (raw === 'close' || raw === 'month-end') return REPORT_JOBS.close;
  return defaultReportsJob(roleKey, { openExceptionCount });
}

const Reports = () => {
  const { show: showToast } = useToast();
  const { movements, products: liveProducts } = useInventory();
  const ws = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const stored = typeof window !== 'undefined' ? loadStoredPeriodRange() : null;
  const [startDate, setStartDate] = useState(stored?.startDate || startOfMonthYmd);
  const [endDate, setEndDate] = useState(stored?.endDate || ymdLocal);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [recentIds, setRecentIds] = useState(() => loadRecentExportIds());
  const [lastDownloadMap, setLastDownloadMap] = useState(() => loadLastDownloadMap());
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bundleBusy, setBundleBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showMoreOversight, setShowMoreOversight] = useState(false);
  const [stockBranchPick, setStockBranchPick] = useState(() => loadStoredStockBranchId());

  const periodValid = Boolean(startDate && endDate && startDate <= endDate);

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

  const openExceptionCount = openPaymentExceptionQueue.length;

  const job = useMemo(
    () => resolveJobFromSearch(searchParams, ws.session?.user?.roleKey, openExceptionCount),
    [searchParams, ws.session?.user?.roleKey, openExceptionCount]
  );

  const setJob = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('job', next);
          p.delete('tab');
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!searchParams.get('job') && !searchParams.get('tab')) {
      setJob(defaultReportsJob(ws.session?.user?.roleKey, { openExceptionCount }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial role landing only

  const onApplyRange = useCallback((start, end) => {
    setUpdating(true);
    setStartDate(start);
    setEndDate(end);
    saveStoredPeriodRange(start, end);
    window.setTimeout(() => setUpdating(false), 450);
  }, []);

  const onStockBranchChange = useCallback((id) => {
    setStockBranchPick(id);
    saveStoredStockBranchId(id);
  }, []);

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
    branchId: ws.viewAllBranches ? 'ALL' : ws.branchScope || ws.session?.currentBranchId || '',
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

  const periodLabel = useMemo(() => formatPeriodLabel(startDate, endDate), [endDate, startDate]);
  const branchLabel = ws.viewAllBranches
    ? 'All branches (HQ roll-up)'
    : ws.branchLabel || ws.branchScope || ws.session?.currentBranchId || '';

  const branchOptions = useMemo(() => {
    const list = ws?.snapshot?.branches || ws?.session?.branches || [];
    return list
      .map((b) => ({ id: String(b.id || b.branchId || ''), name: b.name || b.id || b.branchId }))
      .filter((b) => b.id);
  }, [ws?.snapshot?.branches, ws?.session?.branches]);

  const stockBranchId = ws.viewAllBranches
    ? stockBranchPick
    : ws.branchScope || ws.session?.currentBranchId || '';
  const stockBranchLabel =
    branchOptions.find((b) => b.id === String(stockBranchId))?.name ||
    (ws.snapshot?.branches || []).find(
      (b) => String(b.id || b.branchId) === String(ws.branchScope || ws.session?.currentBranchId)
    )?.name ||
    ws.branchScope;

  const catalogById = useMemo(() => {
    const map = new Map();
    for (const item of flattenExportCatalog()) map.set(item.id, item);
    return map;
  }, []);

  const stockStatus = useStockRegisterStatus(
    endDate,
    ws.hasPermission('reports.view') ? stockBranchId : ''
  );
  const stockReady = stockStatus.ready;

  const showAccountingSections =
    ws.hasPermission('finance.view') &&
    userMayViewAccountingSectionsOnReportsClient(ws?.session?.user?.roleKey, ws?.permissions);

  const hasFinanceView = ws.hasPermission('finance.view');
  const showExec = ws.hasPermission('exec.dashboard.view');
  const showIntelligence = userMayAccessExecutiveCommandCentreClient(ws?.permissions) || showExec;

  const runExportAction = useCallback(
    async (item, formatLabel) => {
      if (!periodValid) {
        showToast('Fix the period dates first.', { variant: 'error' });
        return;
      }
      setConfirmBusy(true);
      setBusyId(item.id);
      try {
        if (formatLabel === 'Print') {
          if (item.kind === 'api-workbook') handlePackPrint(item.printPack);
          else handlePackPrint(item.pack);
        } else if (item.kind === 'api-workbook') {
          await runApiWorkbook(item.workbook);
        } else {
          handlePackDownload(item.pack, formatLabel, false);
        }
        setRecentIds(pushRecentExportId(item.id));
        setLastDownloadMap(markDownloadAt(item.id));
      } finally {
        setConfirmBusy(false);
        setBusyId(null);
        setConfirm(null);
      }
    },
    [periodValid, showToast, handlePackPrint, runApiWorkbook, handlePackDownload]
  );

  const onRequestExport = useCallback((item, formatLabel) => {
    setConfirm({ item, formatLabel });
  }, []);

  const onExportKpi = useCallback(
    (catalogId) => {
      const item = catalogById.get(catalogId);
      if (!item) return;
      if (item.requiresFinanceView && !hasFinanceView) {
        showToast('That export needs finance access.', { variant: 'info' });
        return;
      }
      const formatLabel = item.kind === 'api-workbook' ? 'Excel' : item.formats?.[0] || 'Excel';
      setJob(REPORT_JOBS.export);
      onRequestExport(item, formatLabel);
    },
    [catalogById, hasFinanceView, showToast, setJob, onRequestExport]
  );

  const onDownloadBundle = useCallback(() => {
    if (!periodValid) {
      showToast('Fix the period dates first.', { variant: 'error' });
      return;
    }
    setBundleBusy(true);
    try {
      downloadMonthEndBundle();
      setLastDownloadMap(markDownloadAt('__bundle__'));
    } finally {
      window.setTimeout(() => setBundleBusy(false), 400);
    }
  }, [periodValid, showToast, downloadMonthEndBundle]);

  const pageTitle =
    job === REPORT_JOBS.close
      ? 'Month-end reports'
      : job === REPORT_JOBS.stock
        ? 'Stock register'
        : job === REPORT_JOBS.exceptions
          ? 'Payment exceptions'
          : 'Export centre';

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

      <StockRegisterMonthEndModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        roleMode="reports"
        branchId={stockBranchId}
        branchLabel={stockBranchLabel}
        showToast={showToast}
        roleKey={ws.session?.user?.roleKey}
        initialPeriodEnd={endDate}
      />

      <ReportsConfirmExportDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && runExportAction(confirm.item, confirm.formatLabel)}
        itemTitle={confirm?.item?.title}
        formatLabel={confirm?.formatLabel}
        startDate={startDate}
        endDate={endDate}
        branchLabel={branchLabel}
        busy={confirmBusy}
      />

      <PageHeader
        title={pageTitle}
        subtitle="Pick a job, set the period, then download. Finance and ops workflows live on their desks."
      />

      <MainPanel className="!p-0 min-w-0 overflow-x-hidden sm:!p-0">
        <div className="p-4 sm:p-8 space-y-6 min-w-0">
          {countOnlyOverview ? (
            <div className={`${PANEL} border-teal-100/80 bg-teal-50/30`}>
              <h3 className={SUBHDR}>Branch summary</h3>
              <p className="text-sm font-medium text-slate-600 mb-4">
                Entity counts for your branch. Detailed exports need Sales, Procurement, Operations, or Finance access.
              </p>
              {summaryErr ? <p className="text-sm font-semibold text-red-600 mb-3">{summaryErr}</p> : null}
              {!aggregateSummary && !summaryErr ? (
                <p className="text-sm font-medium text-slate-500">Loading summary…</p>
              ) : null}
              {aggregateSummary ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Customers', aggregateSummary.customersTotal],
                    ['Quotations', aggregateSummary.quotationsTotal],
                    ['Receipts', aggregateSummary.receiptsTotal],
                    ['Purchase orders', aggregateSummary.purchaseOrdersTotal],
                    ['Deliveries', aggregateSummary.deliveriesTotal],
                    ['Refunds', aggregateSummary.refundsTotal],
                    ['Expenses', aggregateSummary.expensesTotal],
                    ['Products (SKUs)', aggregateSummary.productsTotal],
                  ].map(([label, n]) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5">
                      <p className="text-ui-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className="text-lg font-bold text-zarewa-teal tabular-nums mt-0.5">{Number(n) || 0}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <ReportsExceptionsAlert
                openCount={openExceptionCount}
                onReview={() => setJob(REPORT_JOBS.exceptions)}
              />

              <PageTabs
                tabs={JOB_TABS.map((t) =>
                  t.id === REPORT_JOBS.exceptions && openExceptionCount > 0
                    ? { ...t, label: `Exceptions (${openExceptionCount})` }
                    : t
                )}
                value={job}
                onChange={setJob}
                ariaLabel="Report job"
              />

              <ReportsPeriodBar
                startDate={startDate}
                endDate={endDate}
                onApplyRange={onApplyRange}
                branchLabel={branchLabel}
                periodValid={periodValid}
                updating={updating}
                showStockBranchPicker={Boolean(ws.viewAllBranches)}
                branches={branchOptions}
                stockBranchId={stockBranchPick}
                onStockBranchChange={onStockBranchChange}
              />

              {job === REPORT_JOBS.close ? (
                <ReportsMonthEndPanel
                  periodValid={periodValid}
                  periodLabel={periodLabel}
                  branchLabel={branchLabel}
                  hasFinanceView={hasFinanceView}
                  stockReady={stockReady}
                  openExceptionCount={openExceptionCount}
                  onDownloadBundle={onDownloadBundle}
                  onOpenStock={() => setJob(REPORT_JOBS.stock)}
                  onOpenExceptions={() => setJob(REPORT_JOBS.exceptions)}
                  onRequestExport={onRequestExport}
                  onGoExports={() => setJob(REPORT_JOBS.export)}
                  bundleBusy={bundleBusy}
                  bundleDownloadedAt={lastDownloadMap.__bundle__ || ''}
                  lastDownloadMap={lastDownloadMap}
                  busyId={busyId}
                />
              ) : null}

              {job === REPORT_JOBS.export ? (
                <div className="space-y-4">
                  <ReportsKpiStrip salesKpis={salesKpis} onExportKpi={onExportKpi} />
                  <ReportsExportCatalog
                    hasFinanceView={hasFinanceView}
                    periodValid={periodValid}
                    onRequestExport={onRequestExport}
                    recentIds={recentIds}
                    lastDownloadMap={lastDownloadMap}
                    busyId={busyId}
                  />
                </div>
              ) : null}

              {job === REPORT_JOBS.stock ? (
                ws.hasPermission('reports.view') ? (
                  <ReportsStockStatusCard
                    endDate={endDate}
                    branchId={stockBranchId}
                    branchLabel={stockBranchLabel}
                    showToast={showToast}
                    onOpen={() => setStockModalOpen(true)}
                    statusApi={stockStatus}
                  />
                ) : (
                  <p className="text-sm text-slate-600">Stock register requires reports access.</p>
                )
              ) : null}

              {job === REPORT_JOBS.exceptions ? (
                <PaymentExceptionQueuePanel
                  queue={paymentExceptionQueue}
                  openCount={openExceptionCount}
                  closureNotes={exceptionClosureNotes}
                  onToggleClosed={toggleExceptionClosed}
                  onUpdateNote={updateExceptionNote}
                />
              ) : null}

              {showAccountingSections || showExec ? (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setShowMoreOversight((v) => !v)}
                    aria-expanded={showMoreOversight}
                  >
                    <span className="text-sm font-bold text-slate-800">Leadership packs &amp; advanced tools</span>
                    <span className="text-ui-xs font-bold text-teal-800 uppercase">
                      {showMoreOversight ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  {showMoreOversight ? (
                    <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                      <p className="text-xs text-slate-600">
                        GL, AP diagnostics, and cash confirmation live on{' '}
                        <Link to="/accounting" className="font-bold text-teal-800 underline-offset-2 hover:underline">
                          Accounting Desk
                        </Link>
                        . Daily/weekly packs stay here for leadership.
                      </p>
                      <ExecutiveReportPacksSection showToast={showToast} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <ReportsRelatedLinks
                showExec={showExec}
                showAccounting={showAccountingSections || hasFinanceView}
                showIntelligence={showIntelligence}
                showOperations={typeof ws.canAccessModule === 'function' && ws.canAccessModule('operations')}
              />
            </>
          )}
        </div>
      </MainPanel>
    </PageShell>
  );
};

export default Reports;
