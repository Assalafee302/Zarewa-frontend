import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Factory, Flag, History, Paperclip, Printer } from 'lucide-react';
import { ModalFrame } from '../layout';
import { Card } from '../ui';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { formatNgn as formatNgnUtil } from '../../Data/mockData';
import { formatPersonName as formatPersonNameUtil } from '../../lib/formatPersonName';
import { canApproveProductionGate } from '../../lib/productionGateAccess';
import { useToast } from '../../context/ToastContext';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { ManagementAuditSections } from '../management/ManagementAuditSections';
import { ManagerPoAuditSections } from '../management/ManagerPoAuditSections';
import { OfficialRecordBanner } from '../management/OfficialRecordBanner';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import MaterialIncidentDetailModal from '../material/MaterialIncidentDetailModal';
import { GovernanceDetailPanel } from './GovernanceDetailPanel';
import { StaffPurchaseCreditManagerPreview } from '../management/StaffPurchaseCreditManagerPreview';

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
      />
    );
  }

  return (
    <ModalFrame isOpen={Boolean(selectedIntel)} onClose={closeIntelModal}>
      <div className={`z-modal-panel w-full p-0 overflow-hidden ${isLight ? 'max-w-6xl' : 'max-w-5xl'}`}>
        <Card
          className={`flex flex-col shadow-xl overflow-hidden max-h-[min(92vh,960px)] ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between gap-2 ${
              isLight ? 'border-slate-200 bg-white' : 'border-white/10'
            }`}
          >
            <h3
              className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                isLight ? 'text-slate-500' : 'text-white/50'
              }`}
            >
              <History size={14} className={isLight ? 'text-[#134e4a]' : 'text-teal-400'} />
              {intelModalTitle}
            </h3>
            <button
              type="button"
              onClick={closeIntelModal}
              className={`text-[10px] font-bold uppercase transition-colors ${
                isLight ? 'text-slate-400 hover:text-slate-800' : 'text-white/40 hover:text-white'
              }`}
            >
              Close
            </button>
          </div>

          <div
            className={`flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 ${
              isLight ? 'bg-slate-100 space-y-3 text-slate-800' : 'space-y-5 text-white'
            }`}
          >
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
                <OfficialRecordBanner
                  item={selectedUnifiedWorkItem}
                  light={isLight}
                  quoteFallbackId={officialRecordFallbackId}
                  showOpenRecord={selectedIntel?.kind === 'payment'}
                  onOpenRecord={openUnifiedWorkItem}
                />
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
                  canProductionOverride={canApproveProductionGate(ws?.session?.user?.roleKey, {
                    paidNgn: Math.round(
                      Number(selectedIntel.row?.paid_ngn ?? auditData?.summary?.paidNgn ?? auditData?.quotation?.paidNgn) || 0
                    ),
                  })}
                  canManagerClearance={canManagerClearance}
                  canReleasePaymentHolds={canReleasePaymentHolds}
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
                  onProductionOverride={() => void handleProductionOverrideSelectedQuotation?.()}
                />
                <ManagementAuditSections
                  auditData={auditData}
                  loadingAudit={loadingAudit}
                  formatNgn={asMoney}
                  appearance="light"
                />
              </>
            ) : selectedIntel?.kind === 'purchase_order' ? (
              <ManagerPoAuditSections
                auditData={poAuditData}
                loadingAudit={loadingPoAudit}
                formatNgn={asMoney}
                appearance="light"
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
            ) : selectedIntel?.kind === 'payment' ? (
              <div className="space-y-5 animate-in fade-in duration-200 text-slate-700">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700/80 mb-1">Payment request</p>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedIntel.requestId}</h2>
                  <p className="text-xs text-slate-500 mt-2 font-mono">{selectedIntel.row?.expense_id}</p>
                  {selectedIntel.row?.expense_category ? (
                    <p className="text-[11px] text-teal-700 mt-2">
                      Category: <span className="font-semibold text-slate-800">{selectedIntel.row.expense_category}</span>
                    </p>
                  ) : null}
                  {selectedIntel.row?.request_reference ? (
                    <p className="text-[11px] text-slate-600 mt-2">
                      Reference: <span className="font-semibold text-slate-800">{selectedIntel.row.request_reference}</span>
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold text-slate-800 mt-3 tabular-nums">{asMoney(selectedIntel.row?.amount_requested_ngn)}</p>
                  <p className="text-sm text-slate-600 mt-3 leading-snug whitespace-pre-wrap">{selectedIntel.row?.description}</p>
                  <p className="text-[10px] text-slate-500 mt-3 uppercase tracking-wide">{selectedIntel.row?.request_date}</p>

                  {paymentIntelLineItems?.total > 0 ? (
                    <div className="z-scroll-x mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full min-w-[320px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 uppercase tracking-wide border-b border-slate-200 text-[11px] font-bold">
                            <th className="p-2.5">Item</th>
                            <th className="p-2.5 text-right">Unit</th>
                            <th className="p-2.5 text-right">Price</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentIntelLineItems.lines.map((ln, i) => (
                            <tr key={i} className="border-b border-slate-100 text-slate-700">
                              <td className="p-2.5 max-w-0 whitespace-nowrap truncate" title={ln.item || '—'}>
                                {ln.item || '—'}
                              </td>
                              <td className="p-2.5 text-right tabular-nums whitespace-nowrap">{Number(ln.unit) || 0}</td>
                              <td className="p-2.5 text-right tabular-nums whitespace-nowrap">
                                {asMoney(Number(ln.unitPriceNgn ?? ln.unit_price_ngn) || 0)}
                              </td>
                              <td className="p-2.5 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                                {asMoney(Number(ln.lineTotalNgn ?? ln.line_total_ngn) || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {paymentIntelLineItems.total > 20 ? (
                        <p className="px-2.5 py-2 text-[11px] font-semibold text-slate-500">
                          Showing 20 of {paymentIntelLineItems.total} lines.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedIntel.row?.attachment_present ? (
                      <a
                        href={paymentAttachmentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700"
                      >
                        <Paperclip size={14} />
                        {selectedIntel.row?.attachment_name || 'View attachment'}
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400">No attachment</span>
                    )}
                    <button
                      type="button"
                      onClick={() => void printSelectedPaymentRequest?.()}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700"
                    >
                      <Printer size={14} />
                      Print record
                    </button>
                  </div>
                </div>

                <OfficialRecordBanner
                  item={selectedUnifiedWorkItem}
                  light={isLight}
                  quoteFallbackId={officialRecordFallbackId}
                  showOpenRecord={selectedIntel?.kind === 'payment'}
                  onOpenRecord={openUnifiedWorkItem}
                />

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Decision</p>
                  {!canApprovePaymentRequests ? (
                    <ZareApprovalHint
                      context={{
                        referenceNo: selectedIntel.requestId,
                        documentType: 'payment_request',
                        status: selectedIntel.row?.approval_status || 'Pending',
                        canApprove: false,
                        canMutate: ws?.canMutate !== false,
                        missingPermission: 'Payment request approval requires finance.approve permission.',
                        zareQuery: `Why can't I approve payment request ${selectedIntel.requestId}?`,
                      }}
                    />
                  ) : null}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={decisionBusy}
                      onClick={() => handlePaymentDecision?.('Approved')}
                      className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 size={18} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={decisionBusy}
                      onClick={() => handlePaymentDecision?.('Rejected')}
                      className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors"
                    >
                      <Flag size={18} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Reject</span>
                    </button>
                  </div>
                </div>
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
              <div className="space-y-5 animate-in fade-in duration-200 text-slate-700">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700/90 mb-1">Conversion review</p>
                  <h2 className="text-lg font-black text-slate-900 font-mono leading-tight">{selectedIntel.jobId}</h2>
                  <p className="text-xs font-bold text-teal-700 mt-2">{selectedIntel.row?.quotation_ref || '—'}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1 truncate">{asPersonName(selectedIntel.row?.customer_name)}</p>
                  <p className="text-[10px] text-slate-500 mt-2">{selectedIntel.row?.product_name}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-slate-200 text-slate-700">
                      Alert: {selectedIntel.row?.conversion_alert_state || '—'}
                    </span>
                    {selectedIntel.row?.manager_review_required ? (
                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-amber-100 text-amber-900">
                        Manager review
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-4 tabular-nums">
                    Actual: {Number(selectedIntel.row?.actual_meters || 0).toLocaleString()} m
                    {selectedIntel.row?.actual_weight_kg != null
                      ? ` · ${Number(selectedIntel.row.actual_weight_kg).toLocaleString()} kg`
                      : ''}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-2">
                    {selectedIntel.row?.completed_at_iso ? new Date(selectedIntel.row.completed_at_iso).toLocaleString() : ''}
                  </p>
                </div>

                <OfficialRecordBanner
                  item={selectedUnifiedWorkItem}
                  light={isLight}
                  quoteFallbackId={officialRecordFallbackId}
                  showOpenRecord={selectedIntel?.kind === 'payment'}
                  onOpenRecord={openUnifiedWorkItem}
                />

                {selectedIntel.row?.quotation_ref ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                      Quotation context (payments, balance, meters, conversion trail)
                    </p>
                    <ManagementAuditSections
                      auditData={auditData}
                      loadingAudit={loadingAudit}
                      formatNgn={asMoney}
                      appearance="light"
                    />
                  </div>
                ) : null}

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Sign off</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Confirms you have reviewed High/Low conversion or the open manager review for this completed job.
                  </p>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Remark
                    <textarea
                      value={conversionSignoffRemark}
                      onChange={(e) => setConversionSignoffRemark?.(e.target.value)}
                      rows={2}
                      placeholder="e.g. Variance reviewed — approved to close."
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-300/60"
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
                  <button
                    type="button"
                    disabled={decisionBusy}
                    onClick={() => void handleConversionSignoff?.()}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase text-[9px] tracking-widest disabled:opacity-50 transition-colors"
                  >
                    <Factory size={18} />
                    Sign off review
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className={`p-3 border-t ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/30'}`}>
            <p className={`text-[9px] font-semibold text-center uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-white/25'}`}>
              Management · Zarewa
            </p>
          </div>
        </Card>
      </div>
    </ModalFrame>
  );
}
