import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, History, Scale, ShoppingCart, Tag } from 'lucide-react';
import { ModalFrame } from '../layout';
import { Card, Button } from '../ui';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn as formatNgnUtil } from '../../Data/mockData';
import { formatPersonName as formatPersonNameUtil } from '../../lib/formatPersonName';
import { canApproveProductionGate } from '../../lib/productionGateAccess';
import { useToast } from '../../context/ToastContext';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { QuotationPriceExceptionPanel } from '../sales/QuotationPriceExceptionPanel';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { quotationBelowFloorExceptionApproved } from '../../lib/quotationPriceException';
import { ConversionReviewApprovalPreview } from '../management/ConversionReviewApprovalPreview';
import { ConversionReviewConfirmBar } from '../management/ConversionReviewConfirmBar';
import { PaymentRequestApprovalPreview } from '../management/PaymentRequestApprovalPreview';
import { RegisterSettlementApprovalPreview } from '../management/RegisterSettlementApprovalPreview';
import { PurchaseOrderApprovalPreview } from '../management/PurchaseOrderApprovalPreview';
import { ApproveRejectConfirmBar } from '../management/ApproveRejectConfirmBar';
import { ZareApprovalHint } from '../ZareApprovalHint';
import MaterialIncidentDetailModal from '../material/MaterialIncidentDetailModal';
import { GovernanceDetailPanel } from './GovernanceDetailPanel';
import { StaffPurchaseCreditManagerPreview } from '../management/StaffPurchaseCreditManagerPreview';
import {
  DecisionModalBody,
  DecisionModalHeader,
  DecisionStickyActions,
} from '../management/DecisionSurface';

export function ManagementDecisionModal({
  selectedIntel,
  closeIntelModal,
  intelModalTitle,
  intelModalLight = true,
  auditData,
  loadingAudit,
  refundIntelExtras,
  refundEligibilityCheck,
  loadingRefundIntel,
  decisionBusy,
  selectedUnifiedWorkItem,
  officialRecordFallbackId,
  openUnifiedWorkItem,
  selectedRefundRecord,
  canApproveRefunds,
  canApprovePaymentRequests,
  canManagerClearance,
  canReleasePaymentHolds,
  canWriteOffBadDebt,
  canApproveMaterialIncidents,
  deliveryGateMode,
  ws,
  formatNgn,
  handleReview,
  handleRefundDecision,
  handlePaymentDecision,
  handleRegisterSettlementDecision,
  handleConversionSignoff,
  handleDisapproveSelectedQuotation,
  handleFlagSelectedQuotation,
  handleReleasePaymentsSelectedQuotation,
  handleWaiveBalanceSelectedQuotation,
  handleWriteOffReceivableSelectedQuotation,
  handleProductionOverrideSelectedQuotation,
  conversionSignoffRemark,
  setConversionSignoffRemark,
  paymentIntelLineItems,
  selectedPaymentAttachmentUrl,
  printSelectedPaymentRequest,
  poAuditData,
  loadingPoAudit,
  navigate,
  onMaterialDecisionSuccess,
  onGovernanceOpenRefund,
  onGovernanceOpenQuotation,
  onGovernanceOpenProductionQc,
  onGovernanceOpenProcurement,
  canApproveStaffPurchaseCredit,
  canRejectStaffPurchaseCredit,
  handleStaffPurchaseCreditDecision,
}) {
  const { show: showToast } = useToast();
  const [materialDecisionRemark, setMaterialDecisionRemark] = useState('');
  const [materialDecisionBusy, setMaterialDecisionBusy] = useState(false);
  const modalBusy = Boolean(decisionBusy || materialDecisionBusy);

  const asMoney = typeof formatNgn === 'function' ? formatNgn : formatNgnUtil;
  const asPersonName = formatPersonNameUtil;
  const isPriceExceptionDesk =
    selectedIntel?.kind === 'quotation' && selectedIntel?.reviewContext === 'price_exception';
  const focusedReview =
    selectedIntel?.kind === 'conversion' ||
    selectedIntel?.kind === 'payment' ||
    selectedIntel?.kind === 'register_settlement' ||
    selectedIntel?.kind === 'purchase_order' ||
    isPriceExceptionDesk;
  const headerIcon =
    selectedIntel?.kind === 'conversion'
      ? Scale
      : selectedIntel?.kind === 'payment' || selectedIntel?.kind === 'register_settlement'
        ? Banknote
        : selectedIntel?.kind === 'purchase_order'
          ? ShoppingCart
          : isPriceExceptionDesk
            ? Tag
            : History;

  useEffect(() => {
    if (selectedIntel?.kind === 'material') {
      setMaterialDecisionRemark('');
    }
  }, [selectedIntel?.kind, selectedIntel?.materialIncidentId]);

  const handleMaterialApprove = useCallback(
    async (incidentId) => {
      if (!canApproveMaterialIncidents) {
        showToast('You do not have permission to approve stock damage reports.', { variant: 'error' });
        return;
      }
      const id = String(incidentId || '').trim();
      if (!id) return;
      setMaterialDecisionBusy(true);
      try {
        const remark = String(materialDecisionRemark || '').trim() || 'Approved — stock damage report posted.';
        const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
          body: JSON.stringify({ managerRemark: remark }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Approval failed.', { variant: 'error' });
          return;
        }
        showToast(`${id} approved — stock updated.`, { variant: 'success' });
        setMaterialDecisionRemark('');
        await (onMaterialDecisionSuccess?.() ?? Promise.resolve());
      } finally {
        setMaterialDecisionBusy(false);
      }
    },
    [canApproveMaterialIncidents, materialDecisionRemark, onMaterialDecisionSuccess, showToast]
  );

  const handleMaterialReject = useCallback(
    async (incidentId) => {
      if (!canApproveMaterialIncidents) {
        showToast('You do not have permission to reject stock damage reports.', { variant: 'error' });
        return;
      }
      const id = String(incidentId || '').trim();
      if (!id) return;
      const remark = String(materialDecisionRemark || '').trim();
      if (remark.length < 3) {
        showToast('Enter a rejection reason in the remark field (at least 3 characters).', { variant: 'error' });
        return;
      }
      setMaterialDecisionBusy(true);
      try {
        const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/reject`, {
          method: 'POST',
          body: JSON.stringify({ managerRemark: remark }),
        });
        if (!ok || !data?.ok) {
          showToast(data?.error || 'Rejection failed.', { variant: 'error' });
          return;
        }
        showToast(`${id} rejected.`, { variant: 'success' });
        setMaterialDecisionRemark('');
        await (onMaterialDecisionSuccess?.() ?? Promise.resolve());
      } finally {
        setMaterialDecisionBusy(false);
      }
    },
    [canApproveMaterialIncidents, materialDecisionRemark, onMaterialDecisionSuccess, showToast]
  );

  const paymentAttachmentHref = useMemo(() => {
    if (selectedPaymentAttachmentUrl) return selectedPaymentAttachmentUrl;
    if (selectedIntel?.kind !== 'payment' || !selectedIntel.requestId) return '';
    return apiUrl(`/api/payment-requests/${encodeURIComponent(selectedIntel.requestId)}/attachment`);
  }, [selectedIntel, selectedPaymentAttachmentUrl]);

  if (selectedIntel?.kind === 'material') {
    return (
      <MaterialIncidentDetailModal
        isOpen={Boolean(selectedIntel)}
        incidentId={selectedIntel.materialIncidentId}
        canApprove={canApproveMaterialIncidents}
        managerRemark={materialDecisionRemark}
        onManagerRemarkChange={setMaterialDecisionRemark}
        onClose={closeIntelModal}
        onApprove={handleMaterialApprove}
        onReject={handleMaterialReject}
        externalBusy={materialDecisionBusy}
      />
    );
  }

  const stickyFooter =
    selectedIntel?.kind === 'register_settlement' ? (
      <>
        {!canApproveRefunds ? (
          <ZareApprovalHint
            context={{
              referenceNo: selectedIntel.settlementId,
              documentType: 'register_settlement',
              status: selectedIntel.row?.status || 'Pending',
              canApprove: false,
              canMutate: ws?.canMutate !== false,
              missingPermission:
                'Payable withdrawal approval requires refunds.approve or finance.approve permission.',
              zareQuery: `Why can't I approve register withdrawal ${selectedIntel.settlementId}?`,
            }}
          />
        ) : null}
        <ApproveRejectConfirmBar
          hint="Reject keeps this cash on the register. You will be asked for a short note."
          restatement={`Approve pays out ${asMoney(selectedIntel.row?.amountNgn ?? selectedIntel.row?.amount_ngn)}.`}
          busy={modalBusy}
          canApprove={canApproveRefunds}
          canReject={canApproveRefunds}
          approveLabel="Approve withdrawal"
          rejectLabel="Reject"
          resetKey={selectedIntel.settlementId}
          onApprove={() => handleRegisterSettlementDecision?.('Approved')}
          onReject={() => handleRegisterSettlementDecision?.('Rejected')}
        />
      </>
    ) : selectedIntel?.kind === 'payment' ? (
      <>
        {!canApprovePaymentRequests ? (
          <ZareApprovalHint
            context={{
              referenceNo: selectedIntel.requestId,
              documentType: 'payment_request',
              status: selectedIntel.row?.approval_status || 'Pending',
              canApprove: false,
              canMutate: ws?.canMutate !== false,
              missingPermission: 'Expense requests are approved by the Branch Manager (Management / Needs action).',
              zareQuery: `Why can't I approve payment request ${selectedIntel.requestId}?`,
            }}
          />
        ) : null}
        <ApproveRejectConfirmBar
          hint="Reject returns the request so the requester can correct it. You will be asked for a short note."
          restatement={`Approve sends ${asMoney(selectedIntel.row?.amount_requested_ngn)} to Cashier.`}
          busy={modalBusy}
          canApprove={canApprovePaymentRequests}
          canReject={canApprovePaymentRequests}
          approveLabel="Approve request"
          rejectLabel="Reject"
          resetKey={selectedIntel.requestId}
          onApprove={() => handlePaymentDecision?.('Approved')}
          onReject={() => handlePaymentDecision?.('Rejected')}
        />
      </>
    ) : selectedIntel?.kind === 'conversion' ? (
      <ConversionReviewConfirmBar
        jobId={selectedIntel.jobId}
        remark={conversionSignoffRemark}
        onRemarkChange={setConversionSignoffRemark}
        busy={modalBusy}
        alertState={selectedIntel.row?.conversion_alert_state || selectedIntel.row?.conversionAlertState}
        onConfirm={() => void handleConversionSignoff?.()}
      />
    ) : selectedIntel?.kind === 'purchase_order' ? (
      <DecisionStickyActions hint="Purchase-order approve/reject stays on Procurement so buyers and store keep one record.">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            const poId = selectedIntel.row?.po_id || selectedIntel.row?.poID || selectedIntel.poId;
            navigate?.('/procurement', { state: { focusPoId: poId } });
            closeIntelModal?.();
          }}
        >
          <ShoppingCart size={16} />
          Open in Procurement
        </Button>
      </DecisionStickyActions>
    ) : (
      <div className="border-t border-slate-200 bg-white p-3">
        <p className="text-center text-ui-xs font-semibold uppercase tracking-widest text-slate-400">
          Management · Zarewa
        </p>
      </div>
    );

  return (
    <ModalFrame isOpen={Boolean(selectedIntel)} onClose={closeIntelModal} closeDisabled={modalBusy} showCloseButton={false}>
      <div
        className={`z-modal-panel w-full overflow-hidden p-0 ${focusedReview ? 'max-w-3xl' : 'max-w-6xl'}`}
      >
        <Card className="flex max-h-[min(92vh,960px)] flex-col overflow-hidden border-slate-200 bg-white shadow-xl">
          <DecisionModalHeader
            title={intelModalTitle}
            onClose={closeIntelModal}
            busy={modalBusy}
            icon={headerIcon}
          />

          <DecisionModalBody>
            {selectedIntel?.kind === 'governance' ? (
              <GovernanceDetailPanel
                item={selectedIntel.item || selectedIntel}
                formatNgn={asMoney}
                onClose={closeIntelModal}
                onOpenRefund={onGovernanceOpenRefund}
                onOpenQuotation={onGovernanceOpenQuotation}
                onOpenProductionQc={onGovernanceOpenProductionQc}
                onOpenProcurement={onGovernanceOpenProcurement}
              />
            ) : selectedIntel?.kind === 'quotation' ? (
              <>
                {selectedIntel.reviewContext === 'price_exception' ? (
                  <QuotationPriceExceptionPanel
                    layout="desk"
                    quotationId={selectedIntel.quoteId}
                    quotation={
                      auditData?.quotation ||
                      (selectedIntel.row
                        ? {
                            id: selectedIntel.quoteId,
                            paidNgn: selectedIntel.row.paid_ngn ?? selectedIntel.row.paidNgn,
                            priceExceptionMdReviewRequired:
                              selectedIntel.row.price_exception_md_review_required ??
                              selectedIntel.row.priceExceptionMdReviewRequired ??
                              1,
                          }
                        : null)
                    }
                    onQuotationUpdated={(q) => {
                      // Panel already PATCHed approval — close the work item registry entry without re-approving.
                      if (!quotationBelowFloorExceptionApproved(q)) return;
                      void handleReview?.(selectedIntel.quoteId, 'approve_price_exception', '', {
                        alreadyApproved: true,
                      });
                    }}
                  />
                ) : null}
                {selectedIntel.reviewContext !== 'price_exception' ? (
                <ClearanceManagerApprovalPreview
                  quoteId={selectedIntel.quoteId}
                  inboxRow={selectedIntel.row}
                  auditData={auditData}
                  paymentIntel={refundIntelExtras}
                  refundEligibility={refundEligibilityCheck}
                  loadingAudit={loadingAudit}
                  loadingIntel={loadingRefundIntel}
                  formatNgn={asMoney}
                  decisionBusy={decisionBusy}
                  reviewContext={selectedIntel.reviewContext || 'clearance'}
                  fromProductionGate={Boolean(selectedIntel.fromProductionGate)}
                  cuttingListId={selectedIntel.cuttingListId || ''}
                  officialRecord={selectedUnifiedWorkItem}
                  onOpenRecord={
                    selectedUnifiedWorkItem || openUnifiedWorkItem
                      ? () => openUnifiedWorkItem?.(selectedUnifiedWorkItem)
                      : undefined
                  }
                  canProductionOverride={canApproveProductionGate(ws?.session?.user?.roleKey, {
                    paidNgn: Math.round(
                      Number(selectedIntel.row?.paid_ngn ?? auditData?.summary?.paidNgn ?? auditData?.quotation?.paidNgn) || 0
                    ),
                  })}
                  canManagerClearance={canManagerClearance}
                  canReleasePaymentHolds={canReleasePaymentHolds}
                  canWriteOffBadDebt={canWriteOffBadDebt}
                  showReleasePayments={Boolean(
                    selectedUnifiedWorkItem?.managerClearedAtIso ||
                      selectedUnifiedWorkItem?.managerFlaggedAtIso ||
                      auditData?.summary?.managerClearedAtIso ||
                      auditData?.summary?.managerFlaggedAtIso
                  )}
                  onApprove={() => handleReview?.(selectedIntel.quoteId, 'clear')}
                  onDisapprove={() => void handleDisapproveSelectedQuotation?.()}
                  onFlag={() => void handleFlagSelectedQuotation?.()}
                  onReleasePayments={() => void handleReleasePaymentsSelectedQuotation?.()}
                  onWaiveBalance={() => void handleWaiveBalanceSelectedQuotation?.()}
                  onWriteOffReceivable={() => void handleWriteOffReceivableSelectedQuotation?.()}
                  onProductionOverride={() => void handleProductionOverrideSelectedQuotation?.()}
                />
                ) : null}
              </>
            ) : selectedIntel?.kind === 'purchase_order' ? (
              <PurchaseOrderApprovalPreview
                row={selectedIntel.row}
                poId={selectedIntel.poId}
                formatNgn={asMoney}
                auditData={poAuditData}
                loadingAudit={loadingPoAudit}
              />
            ) : selectedIntel?.kind === 'refund' ? (
              <>
                {!canApproveRefunds ? (
                  <ZareApprovalHint
                    context={{
                      referenceNo: selectedIntel.refundId,
                      documentType: 'refund_request',
                      status: selectedIntel.row?.status || 'Pending',
                      canApprove: false,
                      canMutate: ws?.canMutate !== false,
                      missingPermission: 'Refund approval requires refunds.approve or finance.approve permission.',
                      zareQuery: `Why can't I approve refund ${selectedIntel.refundId}?`,
                    }}
                  />
                ) : null}
                <RefundManagerApprovalPreview
                  refundId={selectedIntel.refundId}
                  inboxRow={selectedIntel.row}
                  refundRecord={selectedRefundRecord}
                  auditData={auditData}
                  loadingAudit={loadingAudit}
                  refundIntel={refundIntelExtras}
                  loadingIntel={loadingRefundIntel}
                  formatNgn={asMoney}
                  decisionBusy={decisionBusy}
                  deliveryPaymentGate={deliveryGateMode}
                  refundExecutiveThresholdNgn={Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000}
                  officialRecord={selectedUnifiedWorkItem}
                  onApprove={(decisionExtras) => handleRefundDecision?.('Approved', decisionExtras)}
                  onReject={(decisionExtras) => handleRefundDecision?.('Rejected', decisionExtras)}
                  onOpenSales={() =>
                    navigate?.('/sales', {
                      state: {
                        focusSalesTab: 'refund',
                        openSalesRecord: { type: 'refund', id: selectedIntel.refundId },
                      },
                    })
                  }
                />
              </>
            ) : selectedIntel?.kind === 'register_settlement' ? (
              <RegisterSettlementApprovalPreview
                settlementId={selectedIntel.settlementId}
                row={selectedIntel.row}
                formatNgn={asMoney}
              />
            ) : selectedIntel?.kind === 'payment' ? (
              <PaymentRequestApprovalPreview
                requestId={selectedIntel.requestId}
                row={selectedIntel.row}
                formatNgn={asMoney}
                lineItems={paymentIntelLineItems}
                attachmentHref={paymentAttachmentHref}
                onPrint={printSelectedPaymentRequest}
                officialRecord={selectedUnifiedWorkItem}
                officialRecordFallbackId={officialRecordFallbackId}
                onOpenRecord={openUnifiedWorkItem}
                isLight={intelModalLight !== false}
              />
            ) : selectedIntel?.kind === 'staff_purchase_credit' ? (
              <StaffPurchaseCreditManagerPreview
                row={selectedIntel.row}
                formatNgn={asMoney}
                canApprove={canApproveStaffPurchaseCredit}
                canReject={canRejectStaffPurchaseCredit}
                busy={decisionBusy}
                onApprove={() => void handleStaffPurchaseCreditDecision?.('approve')}
                onReject={(note) => void handleStaffPurchaseCreditDecision?.('reject', note)}
              />
            ) : selectedIntel?.kind === 'conversion' ? (
              <ConversionReviewApprovalPreview
                jobId={selectedIntel.jobId}
                inboxRow={selectedIntel.row}
                auditData={auditData}
                loading={loadingAudit}
                unifiedWorkItem={selectedUnifiedWorkItem}
                formatPersonName={asPersonName}
              />
            ) : null}
          </DecisionModalBody>

          {stickyFooter}
        </Card>
      </div>
    </ModalFrame>
  );
}
