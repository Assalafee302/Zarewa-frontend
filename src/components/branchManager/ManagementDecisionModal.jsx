import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Factory, Flag, History, Paperclip, Printer, ShoppingCart } from 'lucide-react';
import { ModalFrame } from '../layout';
import { Card, Button } from '../ui';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn as formatNgnUtil } from '../../Data/mockData';
import { formatPersonName as formatPersonNameUtil } from '../../lib/formatPersonName';
import { canApproveProductionGate } from '../../lib/productionGateAccess';
import { useToast } from '../../context/ToastContext';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { ConversionRecordPanel } from '../management/ConversionRecordPanel';
import { ManagerPoAuditSections } from '../management/ManagerPoAuditSections';
import { OfficialRecordBanner } from '../management/OfficialRecordBanner';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import MaterialIncidentDetailModal from '../material/MaterialIncidentDetailModal';
import { GovernanceDetailPanel } from './GovernanceDetailPanel';
import { StaffPurchaseCreditManagerPreview } from '../management/StaffPurchaseCreditManagerPreview';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import {
  DecisionActionTile,
  DecisionBand,
  DecisionChip,
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
  handleConversionSignoff,
  handleDisapproveSelectedQuotation,
  handleFlagSelectedQuotation,
  handleReleasePaymentsSelectedQuotation,
  handleWaiveBalanceSelectedQuotation,
  handleWriteOffReceivableSelectedQuotation,
  handleProductionOverrideSelectedQuotation,
  conversionSignoffRemark,
  setConversionSignoffRemark,
  conversionSignoffEditApprovalId,
  setConversionSignoffEditApprovalId,
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
  const isLight = intelModalLight !== false;

  useEffect(() => {
    if (selectedIntel?.kind === 'material') {
      setMaterialDecisionRemark('');
    }
  }, [selectedIntel?.kind, selectedIntel?.materialIncidentId]);

  const handleMaterialApprove = useCallback(
    async (incidentId) => {
      if (!canApproveMaterialIncidents) {
        showToast('You do not have permission to approve material incidents.', { variant: 'error' });
        return;
      }
      const id = String(incidentId || '').trim();
      if (!id) return;
      setMaterialDecisionBusy(true);
      try {
        const remark = String(materialDecisionRemark || '').trim() || 'Approved — material incident posted.';
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
        showToast('You do not have permission to reject material incidents.', { variant: 'error' });
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
    selectedIntel?.kind === 'payment' ? (
      <DecisionStickyActions>
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DecisionActionTile
            variant="approve"
            icon={CheckCircle2}
            label="Approve"
            disabled={modalBusy || !canApprovePaymentRequests}
            onClick={() => handlePaymentDecision?.('Approved')}
          />
          <DecisionActionTile
            variant="reject"
            icon={Flag}
            label="Reject"
            disabled={modalBusy || !canApprovePaymentRequests}
            onClick={() => handlePaymentDecision?.('Rejected')}
          />
        </div>
      </DecisionStickyActions>
    ) : selectedIntel?.kind === 'conversion' ? (
      <DecisionStickyActions hint="Confirms you have reviewed High/Low conversion or the open manager review for this completed job.">
        <label className="block text-ui-xs font-black uppercase tracking-widest text-slate-500">
          Remark
          <textarea
            value={conversionSignoffRemark}
            onChange={(e) => setConversionSignoffRemark?.(e.target.value)}
            rows={2}
            placeholder="e.g. Variance reviewed — approved to close."
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-300/60"
          />
        </label>
        {selectedIntel.jobId ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-2">
            <EditSecondApprovalInline
              entityKind="production_job"
              entityId={selectedIntel.jobId}
              value={conversionSignoffEditApprovalId}
              onChange={setConversionSignoffEditApprovalId}
              className="!border-amber-300/80 !bg-white !text-amber-900"
            />
          </div>
        ) : null}
        <DecisionActionTile
          variant="brand"
          icon={Factory}
          label="Sign off review"
          disabled={modalBusy}
          onClick={() => void handleConversionSignoff?.()}
        />
      </DecisionStickyActions>
    ) : selectedIntel?.kind === 'purchase_order' ? (
      <DecisionStickyActions hint="Purchase-order approval runs on the Procurement desk. Open the PO there to approve, reject, or amend.">
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
    <ModalFrame isOpen={Boolean(selectedIntel)} onClose={closeIntelModal} closeDisabled={modalBusy}>
      <div className="z-modal-panel w-full max-w-6xl overflow-hidden p-0">
        <Card className="flex max-h-[min(92vh,960px)] flex-col overflow-hidden border-slate-200 bg-white shadow-xl">
          <DecisionModalHeader title={intelModalTitle} onClose={closeIntelModal} busy={modalBusy} icon={History} />

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
                <ClearanceManagerApprovalPreview
                  quoteId={selectedIntel.quoteId}
                  inboxRow={selectedIntel.row}
                  auditData={auditData}
                  paymentIntel={refundIntelExtras}
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
              </>
            ) : selectedIntel?.kind === 'purchase_order' ? (
              <>
                <DecisionBand
                  tone="po"
                  eyebrow="Purchase order"
                  title={
                    selectedIntel.row?.po_id ||
                    selectedIntel.row?.poID ||
                    selectedIntel.poId ||
                    '—'
                  }
                  subtitle={
                    selectedIntel.row?.supplier_name ||
                    selectedIntel.row?.vendor_name ||
                    selectedIntel.row?.description ||
                    null
                  }
                  aside={
                    selectedIntel.row?.amount_ngn != null || selectedIntel.row?.total_ngn != null ? (
                      <>
                        <p className="text-ui-xs font-bold uppercase text-slate-400">Total</p>
                        <p className="text-lg font-black tabular-nums text-slate-900">
                          {asMoney(selectedIntel.row?.amount_ngn ?? selectedIntel.row?.total_ngn)}
                        </p>
                      </>
                    ) : null
                  }
                />
                <ManagerPoAuditSections
                  auditData={poAuditData}
                  loadingAudit={loadingPoAudit}
                  formatNgn={asMoney}
                  appearance="light"
                />
              </>
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
            ) : selectedIntel?.kind === 'payment' ? (
              <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
                <DecisionBand
                  tone="payment"
                  eyebrow="Payment request"
                  title={selectedIntel.requestId}
                  subtitle={selectedIntel.row?.expense_id || selectedIntel.row?.description}
                  aside={
                    <>
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Amount</p>
                      <p className="text-lg font-black tabular-nums text-slate-900">
                        {asMoney(selectedIntel.row?.amount_requested_ngn)}
                      </p>
                      {selectedIntel.row?.request_date ? (
                        <p className="mt-0.5 text-ui-xs uppercase tracking-wide text-slate-500">
                          {selectedIntel.row.request_date}
                        </p>
                      ) : null}
                    </>
                  }
                  meta={
                    selectedIntel.row?.expense_category ? (
                      <ExpenseCategoryLaneBadge
                        category={selectedIntel.row.expense_category}
                        laneKey={selectedIntel.row.expense_category_lane}
                      />
                    ) : null
                  }
                >
                  {selectedIntel.row?.request_reference ? (
                    <p className="mt-2 text-xs text-slate-600">
                      Reference:{' '}
                      <span className="font-semibold text-slate-800">{selectedIntel.row.request_reference}</span>
                    </p>
                  ) : null}
                  {selectedIntel.row?.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-slate-600">
                      {selectedIntel.row.description}
                    </p>
                  ) : null}
                  {(selectedIntel.row?.payee_name ||
                    selectedIntel.row?.payee_account_no ||
                    selectedIntel.row?.payee_bank_name ||
                    selectedIntel.row?.payeeName ||
                    selectedIntel.row?.payeeAccountNo ||
                    selectedIntel.row?.payeeBankName) ? (
                    <div className="mt-3 rounded-xl border border-sky-200/90 bg-sky-50/95 px-3 py-2.5 text-xs text-sky-950 space-y-1">
                      <p className="text-ui-xs font-bold uppercase tracking-wide text-sky-900/90">Pay to</p>
                      {(selectedIntel.row.payee_name || selectedIntel.row.payeeName) ? (
                        <p className="font-bold text-sky-950">
                          {selectedIntel.row.payee_name || selectedIntel.row.payeeName}
                        </p>
                      ) : null}
                      <p className="font-mono text-xs font-semibold tabular-nums leading-snug">
                        {[
                          selectedIntel.row.payee_bank_name || selectedIntel.row.payeeBankName,
                          selectedIntel.row.payee_account_no || selectedIntel.row.payeeAccountNo,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                  ) : null}
                </DecisionBand>

                  {paymentIntelLineItems?.total > 0 ? (
                    <div className="z-scroll-x overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="p-2.5">Item</th>
                            <th className="p-2.5 text-right">Unit</th>
                            <th className="p-2.5 text-right">Price</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentIntelLineItems.lines.map((ln, i) => (
                            <tr key={i} className="border-b border-slate-100 text-slate-700">
                              <td className="max-w-0 truncate whitespace-nowrap p-2.5" title={ln.item || '—'}>
                                {ln.item || '—'}
                              </td>
                              <td className="whitespace-nowrap p-2.5 text-right tabular-nums">{Number(ln.unit) || 0}</td>
                              <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                                {asMoney(Number(ln.unitPriceNgn ?? ln.unit_price_ngn) || 0)}
                              </td>
                              <td className="whitespace-nowrap p-2.5 text-right font-semibold tabular-nums text-slate-900">
                                {asMoney(Number(ln.lineTotalNgn ?? ln.line_total_ngn) || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {paymentIntelLineItems.total > 20 ? (
                        <p className="px-2.5 py-2 text-xs font-semibold text-slate-500">
                          Showing 20 of {paymentIntelLineItems.total} lines.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {selectedIntel.row?.attachment_present ? (
                      <a
                        href={paymentAttachmentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-300"
                      >
                        <Paperclip size={14} />
                        {selectedIntel.row?.attachment_name || 'View attachment'}
                      </a>
                    ) : (
                      <span className="text-ui-xs text-slate-400">No attachment</span>
                    )}
                    <button
                      type="button"
                      onClick={() => void printSelectedPaymentRequest?.()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-300"
                    >
                      <Printer size={14} />
                      Print record
                    </button>
                  </div>

                <OfficialRecordBanner
                  item={selectedUnifiedWorkItem}
                  light={isLight}
                  quoteFallbackId={officialRecordFallbackId}
                  showOpenRecord
                  openRecordLabel="Edit request"
                  onOpenRecord={openUnifiedWorkItem}
                />
              </div>
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
              <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
                <DecisionBand
                  tone="convert"
                  eyebrow="Conversion review"
                  title={selectedIntel.jobId}
                  subtitle={asPersonName(selectedIntel.row?.customer_name)}
                  meta={
                    <>
                      <DecisionChip tone="slate">
                        Alert: {selectedIntel.row?.conversion_alert_state || '—'}
                      </DecisionChip>
                      {selectedIntel.row?.manager_review_required ? (
                        <DecisionChip tone="amber">Manager review</DecisionChip>
                      ) : null}
                      {selectedIntel.row?.completed_at_iso ? (
                        <DecisionChip tone="slate">
                          {new Date(selectedIntel.row.completed_at_iso).toLocaleString()}
                        </DecisionChip>
                      ) : null}
                    </>
                  }
                >
                  <p className="mt-1 text-xs font-bold text-teal-700">{selectedIntel.row?.quotation_ref || '—'}</p>
                  {selectedIntel.row?.product_name ? (
                    <p className="mt-1 text-ui-xs text-slate-500">{selectedIntel.row.product_name}</p>
                  ) : null}
                  {(selectedUnifiedWorkItem?.referenceNo || selectedUnifiedWorkItem?.id) && (
                    <p className="mt-2 font-mono text-ui-xs text-slate-500">
                      Record {selectedUnifiedWorkItem.referenceNo || selectedUnifiedWorkItem.id}
                      {selectedUnifiedWorkItem.keyDecisionSummary
                        ? ` · ${selectedUnifiedWorkItem.keyDecisionSummary}`
                        : ''}
                    </p>
                  )}
                </DecisionBand>

                <ConversionRecordPanel
                  auditData={auditData}
                  loading={loadingAudit}
                  focusJobId={selectedIntel.jobId}
                  title="Conversion record"
                  emptyMessage="No coil or conversion check found for this job yet. Refresh or open Production QC."
                />
              </div>
            ) : null}
          </DecisionModalBody>

          {stickyFooter}
        </Card>
      </div>
    </ModalFrame>
  );
}
