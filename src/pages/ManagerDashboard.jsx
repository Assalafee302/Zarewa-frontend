import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FinancePilotHeader,
  ModalFrame,
  PageShell,
  PageTabs,
} from '../components/layout';
import DeliveryGateDiagnosticsBanner from '../components/finance/DeliveryGateDiagnosticsBanner';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { BranchManagerCommandInbox } from '../components/branchManager/BranchManagerCommandInbox';
import { ManagerPriorityBanner, pickManagerPriorityItem } from '../components/branchManager/ManagerPriorityBanner';
import { ManagerTodayPulse } from '../components/branchManager/ManagerTodayPulse';
import { ManagerDailyChecklist } from '../components/branchManager/ManagerDailyChecklist';
import { ManagerIntelligenceTab } from '../components/branchManager/ManagerIntelligenceTab';
import { ManagerOperationsTab } from '../components/branchManager/ManagerOperationsTab';
import { ManagerPerformanceTab } from '../components/branchManager/ManagerPerformanceTab';
import { ManagementDecisionModal } from '../components/branchManager/ManagementDecisionModal';
import {
  ManagementConfirmDialog,
  ManagementRemarkDialog,
} from '../components/branchManager/ManagementRemarkDialog';
import { useBranchManagerWorkstation } from '../hooks/useBranchManagerWorkstation';
import { EditApprovalDetailModal } from '../components/branchManager/EditApprovalDetailModal';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { computeBranchHealthScore } from '../lib/managerBranchHealthScore';
import {
  checklistCompletionPct,
  loadManagerChecklist,
  ymdLocal,
} from '../lib/managerDailyChecklist';
import {
  MANAGER_PAGE_TABS,
  TEAM_HR_ATTENDANCE_PATH,
  normalizeManagerPageTab,
} from '../lib/managerPageTabs';
import { formatPersonName } from '../lib/formatPersonName';

/**
 * Branch manager command center — Sequence shell, four moments, Priority Action Center.
 */
const ManagerDashboard = () => {
  const bm = useBranchManagerWorkstation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  const pageTab = normalizeManagerPageTab(searchParams.get('tab'));

  const setPageTab = useCallback(
    (next) => {
      const id = normalizeManagerPageTab(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (id === 'today') p.delete('tab');
          else p.set('tab', id);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const showDeliveryBanner = ['md', 'admin', 'sales_manager'].includes(bm.managerRoleKey);

  const checklistPct = useMemo(() => {
    const state = loadManagerChecklist(bm.mgrBranchId, ymdLocal());
    return checklistCompletionPct(state);
  }, [bm.mgrBranchId]);

  const healthScore = useMemo(
    () =>
      computeBranchHealthScore({
        totalOpenActions: bm.totalOpenActions,
        overdueCount: bm.tabCounts?.governance || 0,
        stockRegisterCount: bm.stockRegisterInbox.length,
        lowStockCount: bm.displaySnapshots?.lowStockCount || 0,
        attendancePendingCount: bm.attendancePendingCount,
        salesProgressPct: bm.producedSalesProgress,
        metresProgressPct: bm.productionMetresProgress,
        checklistCompletionPct: checklistPct,
      }),
    [
      bm.attendancePendingCount,
      bm.displaySnapshots?.lowStockCount,
      bm.producedSalesProgress,
      bm.productionMetresProgress,
      bm.stockRegisterInbox.length,
      bm.tabCounts?.governance,
      bm.totalOpenActions,
      checklistPct,
    ]
  );

  const priorityItem = useMemo(() => {
    if (bannerDismissed) return null;
    return pickManagerPriorityItem({
      pendingOrderSignOffCount: bm.pendingOrderSignOffCount,
      stockRegisterCount: bm.stockRegisterInbox.length,
      governanceCount: bm.tabCounts?.governance || 0,
      expenseCoach: bm.ws?.snapshot?.expenseCategoryBranchCoachAlert,
    });
  }, [
    bannerDismissed,
    bm.pendingOrderSignOffCount,
    bm.stockRegisterInbox.length,
    bm.tabCounts?.governance,
    bm.ws?.snapshot?.expenseCategoryBranchCoachAlert,
  ]);

  const branchLabel =
    bm.mgrBranchLabel ||
    bm.ws?.session?.branchName ||
    bm.ws?.snapshot?.workspaceBranchName ||
    'Branch';

  const subtitle = useMemo(() => {
    if (bm.totalOpenActions > 0) {
      return `${bm.totalOpenActions} open action${bm.totalOpenActions === 1 ? '' : 's'} need your decision today.`;
    }
    return `${branchLabel} · queue clear · health ${healthScore.score} (${healthScore.status})`;
  }, [bm.totalOpenActions, branchLabel, healthScore.score, healthScore.status]);

  const jumpToQueue = useCallback(
    (action) => {
      setPageTab('today');
      if (action === 'stock') {
        bm.setActiveTab('stock');
        return;
      }
      if (action === 'governance') {
        bm.setActiveTab('governance');
        bm.setAttentionFilter('all');
        return;
      }
      if (action === 'orders') {
        bm.setActiveTab('orders');
        bm.setAttentionFilter('orders');
        return;
      }
      if (action === 'cash') {
        bm.setActiveTab('cash_out');
        bm.setAttentionFilter('cash');
        return;
      }
      if (action === 'qc' || action === 'material') {
        bm.setActiveTab(action === 'qc' ? 'qc' : 'material');
        bm.setAttentionFilter(action);
      }
    },
    [bm, setPageTab]
  );

  const handleCommandSearch = useCallback(
    (e) => {
      e.preventDefault();
      const q = commandSearch.trim();
      if (!q) return;
      setPageTab('today');
      bm.setActiveTab('attention');
      bm.setAttentionFilter('all');
      bm.setInboxSearch(q);
    },
    [bm, commandSearch, setPageTab]
  );

  // Deep-link ?inbox=attendance → My Team
  useEffect(() => {
    const inbox = (searchParams.get('inbox') || '').trim().toLowerCase();
    if (inbox === 'attendance' || inbox === 'staff') {
      navigate(TEAM_HR_ATTENDANCE_PATH, { replace: true });
    }
  }, [navigate, searchParams]);

  const actorName = formatPersonName(
    bm.ws?.session?.user?.displayName || bm.ws?.session?.user?.name || bm.ws?.session?.user?.email || 'Manager'
  );

  return (
    <PageShell className="pb-14">
      <FinancePilotHeader
        eyebrow="Branch manager"
        title={branchLabel}
        subtitle={subtitle}
        search={
          <form onSubmit={handleCommandSearch} className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              placeholder="Search quote, PO, refund, job…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
            />
          </form>
        }
        tabs={<PageTabs tabs={MANAGER_PAGE_TABS} value={pageTab} onChange={setPageTab} ariaLabel="Manager sections" />}
      />

      {bm.loadError ? (
        <div
          className="rounded-zarewa border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 mb-5"
          role="alert"
        >
          {bm.loadError}{' '}
          <button type="button" className="underline font-bold" onClick={() => void bm.fetchData?.()}>
            Retry
          </button>
        </div>
      ) : null}

      {showDeliveryBanner ? (
        <div className="mb-5">
          <DeliveryGateDiagnosticsBanner deliveryPaymentGate={bm.deliveryGateMode} />
        </div>
      ) : null}

      <ManagerPriorityBanner
        item={priorityItem}
        onDismiss={() => setBannerDismissed(true)}
        onAction={(item) => jumpToQueue(item.action)}
      />

      {pageTab === 'today' ? (
        <div className="space-y-5">
          <ManagerTodayPulse
            salesProduced={bm.displaySnapshots?.producedSalesNgn}
            cashCleared={bm.displaySnapshots?.paidOnQuotesNgn}
            metresProduced={bm.displaySnapshots?.completedProductionMetres}
            metresCuttingLists={bm.displaySnapshots?.metersCuttingLists}
            openActions={bm.totalOpenActions}
            healthScore={healthScore}
            salesTarget={bm.displaySnapshots?.targets?.nairaTarget}
            metresTarget={bm.displaySnapshots?.targets?.meterTarget}
            periodLabel={bm.displaySnapshots?.periodLabel ?? 'This period'}
            loading={bm.loading}
          />

          <BranchManagerCommandInbox bm={bm} showDeliveryCreditTab={bm.showDeliveryCreditTab} />

          <ManagerDailyChecklist branchId={bm.mgrBranchId} actorName={actorName} />
        </div>
      ) : null}

      {pageTab === 'intelligence' ? (
        <ManagerIntelligenceTab
          displaySnapshots={bm.displaySnapshots}
          branchLabel={branchLabel}
          mayViewReports={userMayViewManagementReportsClient(
            bm.ws?.session?.user?.roleKey,
            bm.ws?.permissions
          )}
          onJumpFilter={(f) => jumpToQueue(f)}
        />
      ) : null}

      {pageTab === 'operations' ? (
        <ManagerOperationsTab
          ws={bm.ws}
          showDeliveryCredit={bm.showDeliveryCreditTab}
          materialCount={bm.tabCounts?.material || 0}
          attendancePendingCount={bm.attendancePendingCount}
          onOpenMaterialQueue={() => jumpToQueue('material')}
          onOpenStockRegister={() => bm.setStockRegisterMgrOpen(true)}
        />
      ) : null}

      {pageTab === 'performance' ? (
        <ManagerPerformanceTab
          displaySnapshots={bm.displaySnapshots}
          metricPeriod={bm.metricPeriod}
          onMetricPeriodChange={bm.setMetricPeriod}
          managerTargetSourceMeta={bm.managerTargetSourceMeta}
          totalOpenActions={bm.totalOpenActions}
          producedSalesProgress={bm.producedSalesProgress}
          productionMetresProgress={bm.productionMetresProgress}
          healthScore={healthScore}
          mayViewReports={userMayViewManagementReportsClient(
            bm.ws?.session?.user?.roleKey,
            bm.ws?.permissions
          )}
          loading={bm.loading}
        />
      ) : null}

      <ManagementDecisionModal
        selectedIntel={bm.selectedIntel}
        closeIntelModal={bm.closeIntelModal}
        intelModalTitle={bm.intelModalTitle}
        intelModalLight={bm.intelModalLight}
        auditData={bm.auditData}
        loadingAudit={bm.loadingAudit}
        refundIntelExtras={bm.refundIntelExtras}
        loadingRefundIntel={bm.loadingRefundIntel}
        decisionBusy={bm.decisionBusy}
        selectedUnifiedWorkItem={bm.selectedUnifiedWorkItem}
        officialRecordFallbackId={bm.officialRecordFallbackId}
        openUnifiedWorkItem={bm.openUnifiedWorkItem}
        selectedRefundRecord={bm.selectedRefundRecord}
        canApproveRefunds={bm.canApproveRefunds}
        canApprovePaymentRequests={bm.canApprovePaymentRequests}
        canManagerClearance={bm.canManagerClearance}
        canReleasePaymentHolds={bm.canReleasePaymentHolds}
        canWriteOffBadDebt={bm.canWriteOffBadDebt}
        canApproveMaterialIncidents={bm.canApproveMaterialIncidents}
        deliveryGateMode={bm.deliveryGateMode}
        ws={bm.ws}
        formatNgn={bm.formatNgn}
        handleReview={bm.handleReview}
        handleRefundDecision={bm.handleRefundDecision}
        handlePaymentDecision={bm.handlePaymentDecision}
        handleConversionSignoff={bm.handleConversionSignoff}
        handleDisapproveSelectedQuotation={bm.handleDisapproveSelectedQuotation}
        handleFlagSelectedQuotation={bm.handleFlagSelectedQuotation}
        handleReleasePaymentsSelectedQuotation={bm.handleReleasePaymentsSelectedQuotation}
        handleWaiveBalanceSelectedQuotation={bm.handleWaiveBalanceSelectedQuotation}
        handleWriteOffReceivableSelectedQuotation={bm.handleWriteOffReceivableSelectedQuotation}
        handleProductionOverrideSelectedQuotation={bm.handleProductionOverrideSelectedQuotation}
        conversionSignoffRemark={bm.conversionSignoffRemark}
        setConversionSignoffRemark={bm.setConversionSignoffRemark}
        conversionSignoffEditApprovalId={bm.conversionSignoffEditApprovalId}
        setConversionSignoffEditApprovalId={bm.setConversionSignoffEditApprovalId}
        paymentIntelLineItems={bm.paymentIntelLineItems}
        selectedPaymentAttachmentUrl={bm.selectedPaymentAttachmentUrl}
        printSelectedPaymentRequest={bm.printSelectedPaymentRequest}
        poAuditData={bm.poAuditData}
        loadingPoAudit={bm.loadingPoAudit}
        navigate={bm.navigate}
        onMaterialDecisionSuccess={async () => {
          await bm.fetchData();
          await (bm.ws.refresh?.() ?? Promise.resolve());
          bm.closeIntelModal();
        }}
        onGovernanceOpenRefund={bm.openGovernanceLinkedRefund}
        onGovernanceOpenQuotation={bm.openGovernanceLinkedQuotation}
        onGovernanceOpenProductionQc={bm.openGovernanceLinkedProductionQc}
        onGovernanceOpenProcurement={bm.openProcurementDesk}
        canApproveStaffPurchaseCredit={bm.canApproveStaffPurchaseCreditMd}
        canRejectStaffPurchaseCredit={bm.canRejectStaffPurchaseCreditMd}
        handleStaffPurchaseCreditDecision={bm.handleStaffPurchaseCreditDecision}
      />

      <EditApprovalDetailModal
        isOpen={bm.editApprovalModal.open}
        editApprovalId={bm.editApprovalModal.id}
        inboxRow={bm.editApprovalModal.row}
        canApprove={bm.canApproveEdits}
        onClose={bm.closeEditApprovalModal}
        onDecisionComplete={async () => {
          await bm.fetchData();
          await (bm.ws.refreshEditApprovalsPending?.() ?? Promise.resolve());
        }}
      />

      <ManagementRemarkDialog
        open={bm.remarkDialog.open}
        title={bm.remarkDialog.title}
        description={bm.remarkDialog.description}
        confirmLabel={bm.remarkDialog.confirmLabel}
        minLength={bm.remarkDialog.minLength}
        optional={bm.remarkDialog.optional}
        value={bm.remarkDraft}
        onChange={bm.setRemarkDraft}
        busy={bm.decisionBusy}
        variant={bm.remarkDialog.variant === 'warning' ? 'danger' : 'primary'}
        onConfirm={bm.submitRemarkDialog}
        onCancel={bm.cancelRemarkDialog}
      />

      <ManagementConfirmDialog
        open={bm.confirmDialog.open}
        title={bm.confirmDialog.title}
        description={bm.confirmDialog.description}
        busy={bm.decisionBusy}
        onConfirm={bm.submitConfirmDialog}
        onCancel={bm.cancelConfirmDialog}
      />

      <ModalFrame isOpen={bm.showExpenseCorrectionModal} onClose={() => bm.setShowExpenseCorrectionModal(false)}>
        <div className="z-modal-panel max-w-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-black text-zarewa-teal">Edit expense request</h3>
            <button
              type="button"
              onClick={() => bm.setShowExpenseCorrectionModal(false)}
              className="text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          <ExpenseRequestFormFields
            form={bm.expenseCorrectionForm}
            setForm={bm.setExpenseCorrectionForm}
            onSubmit={bm.saveExpenseCorrection}
            fileInputRef={bm.payRequestFileRef}
            showToast={bm.showToast}
            formatNgn={bm.formatNgn}
            submitting={bm.savingExpenseCorrection}
            submitLabel="Save request changes"
            hintBeforeSubmit={`Editing request ${bm.editingPaymentRequestId || ''}. This updates request details only (no payout posting).`}
            actor={{ roleKey: bm.ws?.session?.user?.roleKey, permissions: bm.ws?.session?.permissions }}
            hasPermission={(p) => Boolean(bm.ws?.hasPermission?.(p))}
          />
        </div>
      </ModalFrame>

      <StockRegisterMonthEndModal
        isOpen={bm.stockRegisterMgrOpen}
        onClose={() => bm.setStockRegisterMgrOpen(false)}
        roleMode="manager"
        branchId={bm.mgrBranchId}
        branchLabel={bm.mgrBranchLabel}
        showToast={bm.showToast}
        roleKey={bm.ws.session?.user?.roleKey}
      />
    </PageShell>
  );
};

export default ManagerDashboard;
