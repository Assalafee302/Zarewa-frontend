import React, { useCallback } from 'react';
import { PageShell } from '../components/layout';
import DeliveryGateDiagnosticsBanner from '../components/finance/DeliveryGateDiagnosticsBanner';
import { StockRegisterMonthEndModal } from '../components/reports/StockRegisterMonthEndModal';
import { ExpenseRequestFormFields } from '../components/office/ExpenseRequestFormFields.jsx';
import { ModalFrame } from '../components/layout';
import { BranchManagerHealthStrip } from '../components/branchManager/BranchManagerHealthStrip';
import { BranchManagerPulseSection } from '../components/branchManager/BranchManagerPulseSection';
import { BranchManagerCommandInbox } from '../components/branchManager/BranchManagerCommandInbox';
import { ManagementDecisionModal } from '../components/branchManager/ManagementDecisionModal';
import {
  ManagementConfirmDialog,
  ManagementRemarkDialog,
} from '../components/branchManager/ManagementRemarkDialog';
import { useBranchManagerWorkstation } from '../hooks/useBranchManagerWorkstation';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';

const HEALTH_TAB_MAP = {
  orders: 'orders',
  cash: 'cash_out',
  production: 'qc',
  material: 'material',
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
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-600/90">Branch manager</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[#134e4a] tracking-tight mt-1">Workstation</h1>
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

      <BranchManagerHealthStrip signals={bm.healthSignals} onSelect={handleHealthSelect} />

      {!bm.loading && bm.pendingOrderSignOffCount > 0 ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#134e4a]">Order sign-off required</p>
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
            <p className="text-sm font-bold text-[#134e4a]">Month-end stock register</p>
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

      <section className="mb-8" aria-label="Command">
        <BranchManagerCommandInbox bm={bm} />
      </section>

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
            <h3 className="text-lg font-black text-[#134e4a]">Edit expense request</h3>
            <button
              type="button"
              onClick={() => bm.setShowExpenseCorrectionModal(false)}
              className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
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
