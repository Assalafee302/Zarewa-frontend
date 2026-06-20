import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Factory, Flag, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { QuotationPriceExceptionPanel } from '../QuotationPriceExceptionPanel';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { ManagementAuditSections } from '../management/ManagementAuditSections';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { execWorkItemReviewContext, resolveExecReviewView, resolveExecSettlementId } from '../../lib/execWorkItemReview';
import { canApproveProductionGate, productionGateOverrideNoteValid } from '../../lib/productionGateAccess';
import { userMayApproveRefundRequests } from '../../lib/refundsStore';
import { isExecutiveRoleKey, userMayWriteOffReceivableBadDebt } from '../../lib/workspaceGovernanceClient';
import { RECEIVABLE_WRITEOFF_NOTE_MIN_LEN } from '../../lib/receivableWriteOffPolicy';
import { formatPersonName } from '../../lib/formatPersonName';

/**
 * In-page executive review — approve without leaving Command Centre.
 *
 * @param {{
 *   item: object | null;
 *   isOpen: boolean;
 *   onClose: () => void;
 *   onCompleted?: () => void | Promise<void>;
 *   readOnly?: boolean;
 * }} props
 */
export function ExecutiveWorkItemReviewModal({ item, isOpen, onClose, onCompleted, readOnly = false }) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [refundIntelExtras, setRefundIntelExtras] = useState(null);
  const [loadingRefundIntel, setLoadingRefundIntel] = useState(false);
  const [quotationRow, setQuotationRow] = useState(null);
  const [conversionRemark, setConversionRemark] = useState('');
  const [conversionEditApprovalId, setConversionEditApprovalId] = useState('');
  const [settlementDetail, setSettlementDetail] = useState(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementActionError, setSettlementActionError] = useState('');

  const review = useMemo(() => resolveExecReviewView(item), [item]);
  const ctx = useMemo(() => execWorkItemReviewContext(item), [item]);
  const settlementId = useMemo(() => resolveExecSettlementId(item), [item]);
  const canApproveSettlements =
    ws?.hasPermission?.('finance.approve') ||
    ws?.hasPermission?.('refunds.approve') ||
    ws?.hasPermission?.('*');
  const canApproveProductionGateOverride = canApproveProductionGate(ws?.session?.user?.roleKey);
  const canWriteOffBadDebt = userMayWriteOffReceivableBadDebt(ws?.session?.user);
  const canApproveRefunds = userMayApproveRefundRequests(ws);

  const fetchAudit = useCallback(async (quoteId) => {
    const qid = String(quoteId || '').trim();
    if (!qid) return;
    setLoadingAudit(true);
    const { ok, data } = await apiFetch(
      `/api/management/quotation-audit?quotationRef=${encodeURIComponent(qid)}`
    );
    setAuditData(ok && data ? data : { ok: false, error: data?.error || 'Could not load quotation audit.' });
    setLoadingAudit(false);
  }, []);

  const fetchQuotation = useCallback(async (quoteId) => {
    const qid = String(quoteId || '').trim();
    if (!qid) return;
    const { ok, data } = await apiFetch(`/api/quotations/${encodeURIComponent(qid)}`);
    if (ok && data?.quotation) setQuotationRow(data.quotation);
  }, []);

  useEffect(() => {
    if (!isOpen || !item) return;
    setConversionRemark('');
    setConversionEditApprovalId('');
    setAuditData(null);
    setRefundIntelExtras(null);
    setQuotationRow(null);
    setSettlementDetail(null);
    setSettlementNote('');
    setSettlementActionError('');

    if (review.view === 'register_settlement' && settlementId) {
      if (review.row?.settlementId || review.row?.amountNgn != null) {
        setSettlementDetail(review.row);
      }
      setLoadingSettlement(true);
      void (async () => {
        try {
          const { ok, data } = await apiFetch(
            `/api/accounting/settlements/${encodeURIComponent(settlementId)}`
          );
          if (ok && data?.settlement) setSettlementDetail(data.settlement);
          else if (review.row?.settlementId) setSettlementDetail(review.row);
        } finally {
          setLoadingSettlement(false);
        }
      })();
    }
    if (review.view === 'price_exception' && review.quotationId) {
      void fetchQuotation(review.quotationId);
      void fetchAudit(review.quotationId);
    }
    if (review.view === 'quotation' && review.quotationId) {
      void fetchAudit(review.quotationId);
    }
    if (review.view === 'conversion' && review.row?.quotation_ref) {
      void fetchAudit(review.row.quotation_ref);
    }
    if (review.view === 'refund') {
      const qref = String(review.row?.quotation_ref || '').trim();
      if (qref) void fetchAudit(qref);
      if (qref) {
        setLoadingRefundIntel(true);
        void (async () => {
          const { ok, data } = await apiFetch(
            `/api/refunds/intelligence?quotationRef=${encodeURIComponent(qref)}`
          );
          setLoadingRefundIntel(false);
          if (ok && data && data.ok !== false) setRefundIntelExtras(data);
        })();
      }
    }
  }, [isOpen, item, review, settlementId, fetchAudit, fetchQuotation]);

  const finish = useCallback(async () => {
    if (typeof onCompleted === 'function') await onCompleted();
    onClose();
  }, [onCompleted, onClose]);

  const handleQuotationReview = async (quotationId, decision, reason = '') => {
    if (!quotationId || readOnly) return;
    if (decision === 'approve_production') {
      if (!canApproveProductionGateOverride) {
        showToast('Production gate override requires branch manager or MD approval.', { variant: 'error' });
        return;
      }
      let overrideReason = String(reason || '').trim();
      if (!productionGateOverrideNoteValid(overrideReason)) {
        const prompted =
          window.prompt(
            'Why may production proceed below the payment threshold? (required, at least 8 characters)'
          ) ?? '';
        overrideReason = prompted.trim();
      }
      if (!productionGateOverrideNoteValid(overrideReason)) {
        showToast('Override reason must be at least 8 characters.', { variant: 'error' });
        return;
      }
      reason = overrideReason;
    }
    if (decision === 'write_off_receivable') {
      if (!canWriteOffBadDebt) {
        showToast('Material receivable write-off requires MD or Administrator authority.', { variant: 'error' });
        return;
      }
      let writeOffReason = String(reason || '').trim();
      if (writeOffReason.length < RECEIVABLE_WRITEOFF_NOTE_MIN_LEN) {
        const prompted =
          window.prompt(
            `Document why this receivable is written off (required, at least ${RECEIVABLE_WRITEOFF_NOTE_MIN_LEN} characters):`
          ) ?? '';
        writeOffReason = prompted.trim();
      }
      if (writeOffReason.length < RECEIVABLE_WRITEOFF_NOTE_MIN_LEN) {
        showToast(`Write-off reason must be at least ${RECEIVABLE_WRITEOFF_NOTE_MIN_LEN} characters.`, {
          variant: 'error',
        });
        return;
      }
      reason = writeOffReason;
    }
    setBusy(true);
    const { ok, data } = await apiFetch('/api/management/review', {
      method: 'POST',
      body: JSON.stringify({ quotationId, decision, reason }),
    });
    setBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not apply decision.', { variant: 'error' });
      return;
    }
    showToast('Quotation review recorded.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleRefundDecision = async (status, decisionExtras = {}) => {
    if (!review.refundId || readOnly) return;
    const note = String(decisionExtras.managerComments ?? '').trim();
    if (status === 'Rejected' && decisionExtras.inlineManagerNote && note.length < 3) {
      showToast('Enter a rejection reason (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    const fallbackAmount = Number(review.row?.amount_ngn) || 0;
    const amount =
      status === 'Approved'
        ? Math.round(Number(decisionExtras.approvedAmountNgn) || fallbackAmount)
        : 0;
    const { ok, data } = await apiFetch(`/api/refunds/${encodeURIComponent(review.refundId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        managerComments:
          note ||
          (status === 'Approved' ? 'Executive approval' : 'Rejected'),
        ...(status === 'Approved' && amount > 0 ? { approvedAmountNgn: amount } : {}),
        ...(status === 'Approved' && Array.isArray(decisionExtras.calculationLines) && decisionExtras.calculationLines.length
          ? { calculationLines: decisionExtras.calculationLines }
          : {}),
        ...(status === 'Approved'
          ? {
              productionAlignmentAcknowledgedCodes: decisionExtras.productionAlignmentAcknowledgedCodes || [],
              productionAlignmentOverrideNote: decisionExtras.productionAlignmentOverrideNote || '',
            }
          : {}),
      }),
    });
    setBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not update refund.', { variant: 'error' });
      return;
    }
    showToast(status === 'Approved' ? 'Refund approved.' : 'Refund rejected.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleSettlementDecision = async (status) => {
    const sid = settlementId || review.settlementId;
    setSettlementActionError('');
    if (!sid) {
      const msg = 'Could not identify this withdrawal request.';
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
      return;
    }
    if (readOnly) {
      const msg = 'Executive view is read-only for your role.';
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
      return;
    }
    if (!canApproveSettlements) {
      const msg = 'You do not have permission to approve register withdrawals.';
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
      return;
    }
    const settlement = settlementDetail || review.row || {};
    const amount = Math.round(Number(settlement.amountNgn) || Number(item?.amountNgn) || 0);
    const refundHi =
      Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000;
    const roleKey = String(ws?.session?.user?.roleKey || '').trim().toLowerCase();
    const isExec = isExecutiveRoleKey(roleKey) || ws?.hasPermission?.('*');
    if (status === 'Approved' && amount > refundHi && !isExec) {
      const msg = `Withdrawals above ${formatNgn(refundHi)} require Managing Director approval.`;
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
      return;
    }
    const note = settlementNote.trim();
    if (status === 'Rejected' && note.length < 3) {
      const msg = 'Enter a rejection reason (at least 3 characters).';
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/accounting/settlements/${encodeURIComponent(sid)}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          note: note || (status === 'Approved' ? 'Executive approval' : 'Rejected'),
          ...(status === 'Approved' && amount > 0 ? { approvedAmountNgn: amount } : {}),
        }),
      });
      if (!ok || data?.ok === false) {
        const msg = data?.error || 'Could not update withdrawal request.';
        setSettlementActionError(msg);
        showToast(msg, { variant: 'error' });
        return;
      }
      showToast(status === 'Approved' ? 'Withdrawal approved.' : 'Withdrawal rejected.', { variant: 'success' });
      await ws?.refresh?.();
      await finish();
    } catch (err) {
      const msg = String(err?.message || err || 'Could not update withdrawal request.');
      setSettlementActionError(msg);
      showToast(msg, { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentDecision = async (status) => {
    if (!review.requestId || readOnly) return;
    setBusy(true);
    const { ok, data } = await apiFetch(
      `/api/payment-requests/${encodeURIComponent(review.requestId)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ status, note: status === 'Approved' ? 'Executive approval' : 'Rejected' }),
      }
    );
    setBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not update payment request.', { variant: 'error' });
      return;
    }
    showToast(status === 'Approved' ? 'Payment request approved.' : 'Payment request rejected.', {
      variant: 'success',
    });
    await ws?.refresh?.();
    await finish();
  };

  const handleConversionSignoff = async () => {
    if (!review.jobId || readOnly) return;
    const remark = conversionRemark.trim();
    if (remark.length < 3) {
      showToast('Enter a sign-off remark (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    const { ok, data } = await apiFetch(
      `/api/production-jobs/${encodeURIComponent(review.jobId)}/manager-review-signoff`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          remark,
          ...(conversionEditApprovalId.trim() ? { editApprovalId: conversionEditApprovalId.trim() } : {}),
        }),
      }
    );
    setBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not sign off conversion review.', { variant: 'error' });
      return;
    }
    showToast('Conversion review signed off.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleMaterialApprove = async () => {
    const id = review.incidentId;
    if (!id || readOnly) return;
    setBusy(true);
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!ok || data?.ok === false) {
      showToast(data?.error || 'Could not approve material incident.', { variant: 'error' });
      return;
    }
    showToast('Material incident approved.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleEditApproval = async () => {
    const id = review.editApprovalId;
    if (!id || readOnly) return;
    setBusy(true);
    const { ok, data } = await apiFetch(`/api/edit-approvals/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not approve edit.', { variant: 'error' });
      return;
    }
    showToast('Edit approval granted.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  if (!item) return null;

  const kindLabel = String(item.kind || 'review').replace(/_/g, ' ');
  const reasons = ctx.reasons;

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} surface="plain" title={`Executive review — ${kindLabel}`}>
      <div className="z-modal-panel flex max-h-[min(92vh,880px)] w-full max-w-[min(100%,720px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">{kindLabel}</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 truncate">{item.title || 'Review'}</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {item.branchName || '—'}
              {item.amountNgn != null ? ` · ${formatNgn(item.amountNgn)}` : ''}
              {item.requestedBy ? ` · ${item.requestedBy}` : ''}
            </p>
            {reasons.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-[10px] text-amber-900/90 list-disc pl-4">
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
          {review.view === 'price_exception' && review.quotationId ? (
            <>
              <QuotationPriceExceptionPanel
                quotationId={review.quotationId}
                quotation={quotationRow}
                onQuotationUpdated={(q) => {
                  setQuotationRow(q);
                  ws?.mergeQuotationIntoSnapshot?.(q);
                  if (String(q?.mdPriceExceptionApprovedAtISO || '').trim()) {
                    void finish();
                  }
                }}
              />
              <ManagementAuditSections auditData={auditData} loadingAudit={loadingAudit} formatNgn={formatNgn} appearance="light" />
            </>
          ) : null}

          {review.view === 'quotation' && review.quotationId ? (
            <>
              <ClearanceManagerApprovalPreview
                quoteId={review.quotationId}
                inboxRow={review.row}
                auditData={auditData}
                paymentIntel={refundIntelExtras}
                loadingAudit={loadingAudit}
                loadingIntel={loadingRefundIntel}
                formatNgn={formatNgn}
                decisionBusy={busy}
                reviewContext={review.reviewContext || 'clearance'}
                fromProductionGate={Boolean(review.fromProductionGate)}
                cuttingListId={review.cuttingListId || ''}
                canProductionOverride={canApproveProductionGateOverride}
                canWriteOffBadDebt={canWriteOffBadDebt}
                showReleasePayments={false}
                onApprove={() => void handleQuotationReview(review.quotationId, 'clear')}
                onDisapprove={() => {
                  const reason = window.prompt('Why are you disapproving this clearance? (required)');
                  if (reason?.trim()) void handleQuotationReview(review.quotationId, 'flag', reason.trim());
                }}
                onFlag={() => {
                  const reason = window.prompt('Reason for audit flag? (required)');
                  if (reason?.trim()) void handleQuotationReview(review.quotationId, 'flag', reason.trim());
                }}
                onReleasePayments={() => {
                  if (window.confirm('Release payment hold on this quotation?')) {
                    void handleQuotationReview(review.quotationId, 'release_payments');
                  }
                }}
                onWaiveBalance={() => {
                  if (
                    window.confirm(
                      'Waive the small round-off within payment tolerance (max ₦5,000)? It will be removed from Creditors receivables.'
                    )
                  ) {
                    void handleQuotationReview(review.quotationId, 'waive_balance');
                  }
                }}
                onWriteOffReceivable={() => {
                  void handleQuotationReview(review.quotationId, 'write_off_receivable');
                }}
                onProductionOverride={() => void handleQuotationReview(review.quotationId, 'approve_production')}
              />
              <ManagementAuditSections auditData={auditData} loadingAudit={loadingAudit} formatNgn={formatNgn} appearance="light" />
            </>
          ) : null}

          {review.view === 'conversion' ? (
            <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-900">Conversion review</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{review.jobId}</p>
                <p className="text-xs text-slate-600 mt-1">{formatPersonName(review.row?.customer_name)}</p>
                <p className="text-[10px] text-slate-500">{review.row?.product_name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-violet-200">
                    Alert: {review.row?.conversion_alert_state || '—'}
                  </span>
                  {review.row?.manager_review_required ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                      Manager review
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-600 mt-3 tabular-nums">
                  Actual: {Number(review.row?.actual_meters || 0).toLocaleString()} m
                  {review.row?.actual_weight_kg != null
                    ? ` · ${Number(review.row.actual_weight_kg).toLocaleString()} kg`
                    : ''}
                </p>
              </div>
              {review.row?.quotation_ref ? (
                <ManagementAuditSections auditData={auditData} loadingAudit={loadingAudit} formatNgn={formatNgn} appearance="light" />
              ) : null}
              {!readOnly && item.canAct !== false ? (
                <div className="space-y-3 border-t border-violet-200/80 pt-4">
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Confirm you have reviewed high/low conversion variance for this completed job.
                  </p>
                  <textarea
                    value={conversionRemark}
                    onChange={(e) => setConversionRemark(e.target.value)}
                    rows={2}
                    placeholder="Sign-off remark (min. 3 characters)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-violet-300/50"
                  />
                  {review.jobId ? (
                    <EditSecondApprovalInline
                      entityKind="production_job"
                      entityId={review.jobId}
                      value={conversionEditApprovalId}
                      onChange={setConversionEditApprovalId}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConversionSignoff()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-800 disabled:opacity-40"
                  >
                    <Factory size={16} />
                    Sign off conversion review
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {review.view === 'refund' ? (
            <>
              {!canApproveRefunds ? (
                <ZareApprovalHint
                  context={{
                    referenceNo: review.refundId,
                    documentType: 'refund_request',
                    status: review.row?.status || 'Pending',
                    canApprove: false,
                    missingPermission: 'Refund approval requires refunds.approve or finance.approve.',
                  }}
                />
              ) : null}
              <RefundManagerApprovalPreview
                refundId={review.refundId}
                inboxRow={review.row}
                refundRecord={null}
                auditData={auditData}
                loadingAudit={loadingAudit}
                refundIntel={refundIntelExtras}
                loadingIntel={loadingRefundIntel}
                formatNgn={formatNgn}
                decisionBusy={busy}
                deliveryPaymentGate={false}
                refundExecutiveThresholdNgn={
                  Number(ws?.snapshot?.orgGovernanceLimits?.refundExecutiveThresholdNgn) || 1_000_000
                }
                onApprove={(decisionExtras) => void handleRefundDecision('Approved', decisionExtras)}
                onReject={(decisionExtras) => void handleRefundDecision('Rejected', decisionExtras)}
              />
            </>
          ) : null}

          {review.view === 'register_settlement' ? (
            <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
              <p className="text-[10px] font-black uppercase text-teal-900">Register withdrawal</p>
              {!canApproveSettlements ? (
                <ZareApprovalHint
                  context={{
                    referenceNo: settlementId || review.settlementId,
                    documentType: 'register_settlement',
                    status: (settlementDetail || review.row)?.status || 'Pending',
                    canApprove: false,
                    missingPermission: 'Register withdrawal approval requires finance.approve or refunds.approve.',
                  }}
                />
              ) : null}
              {loadingSettlement && !settlementDetail && !review.row?.settlementId ? (
                <p className="text-[11px] text-slate-500">Loading withdrawal details…</p>
              ) : (
                <>
                  <p className="font-mono text-sm font-bold">{settlementId || review.settlementId || '—'}</p>
                  <p className="text-[11px] text-slate-700">
                    {(settlementDetail || review.row)?.partyName || item?.reviewContext?.subtitle || '—'}
                    {(settlementDetail || review.row)?.registerLineId
                      ? ` · ${(settlementDetail || review.row).registerLineId}`
                      : ''}
                  </p>
                  <p className="text-2xl font-black text-[#134e4a] tabular-nums">
                    {formatNgn((settlementDetail || review.row)?.amountNgn ?? item?.amountNgn)}
                  </p>
                  {(settlementDetail || review.row)?.reason ? (
                    <p className="text-[11px] text-slate-600 rounded-lg bg-white border border-slate-100 px-3 py-2">
                      {(settlementDetail || review.row).reason}
                    </p>
                  ) : null}
                  {(settlementDetail || review.row)?.requestedByName ? (
                    <p className="text-[10px] text-slate-500">
                      Requested by {formatPersonName((settlementDetail || review.row).requestedByName)}
                    </p>
                  ) : null}
                </>
              )}
              {!readOnly && canApproveSettlements ? (
                <div className="space-y-3 border-t border-teal-200/80 pt-4">
                  {settlementActionError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800">
                      {settlementActionError}
                    </p>
                  ) : null}
                  <textarea
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                    rows={2}
                    placeholder="Approval or rejection note (required for rejection)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-teal-300/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy || (!settlementId && !review.settlementId)}
                      onClick={() => void handleSettlementDecision('Approved')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      <CheckCircle2 size={14} />
                      {busy ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busy || (!settlementId && !review.settlementId)}
                      onClick={() => void handleSettlementDecision('Rejected')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-rose-500 disabled:opacity-40"
                    >
                      <Flag size={14} />
                      {busy ? 'Saving…' : 'Reject'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {review.view === 'payment' ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase text-slate-500">Payment request</p>
              <p className="font-mono text-sm font-bold">{review.requestId}</p>
              <p className="text-2xl font-black text-[#134e4a] tabular-nums">
                {formatNgn(review.row?.amount_requested_ngn)}
              </p>
              <p className="text-[11px] text-slate-700">{review.row?.description}</p>
              <p className="text-[10px] text-slate-500">{review.row?.expense_category}</p>
              {!readOnly && item.canAct !== false ? (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePaymentDecision('Approved')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePaymentDecision('Rejected')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2.5 text-[10px] font-black uppercase text-white hover:bg-rose-500 disabled:opacity-40"
                  >
                    <Flag size={14} />
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {review.view === 'material' ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-[10px] font-black uppercase text-amber-950">Material exception</p>
              <p className="font-mono text-sm font-bold">{review.incidentId}</p>
              <p className="text-[11px] text-amber-950/90">
                {review.row?.incident_type || 'Incident'} · {review.row?.gauge_label} {review.row?.colour}
              </p>
              {!readOnly && item.canAct !== false ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleMaterialApprove()}
                  className="rounded-lg bg-[#134e4a] px-4 py-2 text-[10px] font-black uppercase text-white hover:bg-[#0f3d39] disabled:opacity-40"
                >
                  Approve incident
                </button>
              ) : null}
            </div>
          ) : null}

          {review.view === 'edit_approval' ? (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-[10px] font-black uppercase text-violet-900">Edit approval</p>
              <p className="text-[11px]">
                {review.row?.entityKind} · <span className="font-mono">{review.row?.entityId}</span>
              </p>
              <p className="text-[10px] text-slate-600">
                Requested by {review.row?.requestedByDisplay || review.row?.requestedByUserId || '—'}
              </p>
              {!readOnly && item.canAct !== false ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleEditApproval()}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-[10px] font-black uppercase text-white hover:bg-violet-800 disabled:opacity-40"
                >
                  Approve edit
                </button>
              ) : null}
            </div>
          ) : null}

          {review.view === 'fallback' ? (
            <p className="text-[11px] text-slate-600">
              Open the linked module to complete this review.
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
          {review.view === 'fallback' && item.route ? (
            <a
              href={item.route}
              className="rounded-lg border border-[#134e4a]/30 bg-[#134e4a]/5 px-4 py-2 text-[10px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
            >
              Open module
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
