import React, { useCallback } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { PageShell } from '../components/layout';
import DeliveryGateDiagnosticsBanner from '../components/finance/DeliveryGateDiagnosticsBanner';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { ModalFrame } from '../components/layout';
import { BranchManagerHealthStrip } from '../components/branchManager/BranchManagerHealthStrip';
import { BranchManagerPulseSection } from '../components/branchManager/BranchManagerPulseSection';
import { BranchManagerCommandInbox } from '../components/branchManager/BranchManagerCommandInbox';
import { DashboardKpiStrip } from '../components/dashboard/DashboardKpiStrip';
import { ManagementDecisionModal } from '../components/branchManager/ManagementDecisionModal';
import {
  ManagementConfirmDialog,
  ManagementRemarkDialog,
} from '../components/branchManager/ManagementRemarkDialog';
import { useBranchManagerWorkstation } from '../hooks/useBranchManagerWorkstation';
import { EditApprovalDetailModal } from '../components/branchManager/EditApprovalDetailModal';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import { managementPeriodStartISO } from '../lib/managementLiveFromWorkspace';

const HEALTH_TAB_MAP = {
  orders: 'orders',
  cash: 'cash_out',
  production: 'qc',
  material: 'material',
  procurement: 'procurement',
  governance: 'governance',
  staff: 'attendance',
};

/**
 * Branch manager workstation — command inbox, branch health, and performance pulse.
 */
const ManagerDashboard = () => {
  const bm = useBranchManagerWorkstation();

  const handleHealthSelect = useCallback(
    (key) => {
      if (key === 'stock') {
        bm.setStockRegisterMgrOpen(true);
        return;
      }
      if (key === 'inventory') {
        bm.navigate('/operations', { state: { focusOpsTab: 'inventory' } });
        return;
      }
      const tab = HEALTH_TAB_MAP[key];
      if (tab) {
        bm.setActiveTab(tab);
        if (tab !== 'attention') bm.setAttentionFilter('all');
      }
    },
    [bm]
  );

  const showDeliveryBanner = ['md', 'admin', 'sales_manager'].includes(bm.managerRoleKey);

  return (
    <PageShell className="pb-14">
      <header className="mb-6">
        <p className="text-ui-xs font-bold uppercase tracking-[0.22em] text-teal-600/90">Branch manager</p>
        <h1 className="text-2xl sm:text-3xl font-black text-zarewa-teal tracking-tight mt-1">Workstation</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Your command desk for branch approvals, risk, staff, and performance — one place to act and to watch the
          branch.
        </p>
      </header>

      {bm.loadError ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 mb-6"
          role="alert"
        >
          {bm.loadError}
        </div>
      ) : null}

      {showDeliveryBanner ? (
        <div className="mb-6">
          <DeliveryGateDiagnosticsBanner deliveryPaymentGate={bm.deliveryGateMode} />
        </div>
      ) : null}

      <DashboardKpiStrip
        sectionClassName="mb-6"
        metricsWindow={{
          startISO: managementPeriodStartISO(bm.metricPeriod),
          label: bm.displaySnapshots.periodLabel ?? 'This month',
        }}
      />

      {!bm.loading && bm.pendingOrderSignOffCount > 0 ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zarewa-teal">Order sign-off required</p>
            <p className="text-xs text-slate-600 mt-1">
              {bm.pendingOrderSignOffCount} paid quotation{bm.pendingOrderSignOffCount === 1 ? '' : 's'} need branch
              manager review. Open each for sign-off (99.5% paid counts as fully paid).
            </p>
          </div>
          <button
            type="button"
            className="z-btn-primary shrink-0"
            onClick={() => {
              bm.setActiveTab('orders');
              bm.setAttentionFilter('all');
            }}
          >
            Review orders
          </button>
        </div>
      ) : null}

      {bm.mgrBranchId ? (
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zarewa-teal">Month-end stock register</p>
            <p className="text-xs text-slate-600 mt-1">
              {bm.stockRegisterInbox.length
                ? `${bm.stockRegisterInbox.length} period(s) awaiting manager count alignment.`
                : 'No registers waiting for manager review.'}
            </p>
          </div>
          <button type="button" className="z-btn-primary shrink-0" onClick={() => bm.setStockRegisterMgrOpen(true)}>
            Review stock register
          </button>
        </div>
      ) : null}

      {bm.ws?.snapshot?.expenseCategoryBranchCoachAlert?.shouldCoach ? (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-orange-50/40 px-4 py-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-ui-xs font-black uppercase tracking-wide text-amber-900">
              <AlertTriangle size={13} aria-hidden />
              Others category — branch coaching
            </p>
            <p className="text-sm font-bold text-amber-950 mt-1.5 tabular-nums">
              {bm.ws.snapshot.expenseCategoryBranchCoachAlert.othersPct ?? '—'}% Others
              <span className="font-medium text-amber-900/80 text-xs ml-1">
                · last {bm.ws.snapshot.expenseCategoryBranchCoachAlert.months || 3} months
              </span>
            </p>
            <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
              {bm.ws.snapshot.expenseCategoryBranchCoachAlert.message ||
                'A high share of approved payment requests were coded Others. Review descriptions and pick standard categories where possible.'}
            </p>
          </div>
          <button
            type="button"
            className="z-btn-primary shrink-0 inline-flex items-center gap-1.5"
            onClick={() => bm.setActiveTab('cash_out')}
          >
            Review cash out
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <section className="mb-8" aria-label="Command">
        <BranchManagerCommandInbox bm={bm} />
      </section>

      <BranchManagerHealthStrip signals={bm.healthSignals} onSelect={handleHealthSelect} compact />

      <BranchManagerPulseSection
        displaySnapshots={bm.displaySnapshots}
        metricPeriod={bm.metricPeriod}
        onMetricPeriodChange={bm.setMetricPeriod}
        managerTargetSourceMeta={bm.managerTargetSourceMeta}
        totalOpenActions={bm.totalOpenActions}
        loading={bm.loading}
        hasWorkspaceData={Boolean(bm.ws?.hasWorkspaceData)}
        producedSalesProgress={bm.producedSalesProgress}
        productionMetresProgress={bm.productionMetresProgress}
        mayViewReports={userMayViewManagementReportsClient(bm.ws)}
      />

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
