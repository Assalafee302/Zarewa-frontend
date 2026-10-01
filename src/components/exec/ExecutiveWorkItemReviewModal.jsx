import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Banknote, History, Package, Scale, Tag, Wallet, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { QuotationPriceExceptionPanel } from '../sales/QuotationPriceExceptionPanel';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { quotationBelowFloorExceptionApproved } from '../../lib/quotationPriceException';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { ConversionReviewApprovalPreview } from '../management/ConversionReviewApprovalPreview';
import { ConversionReviewConfirmBar } from '../management/ConversionReviewConfirmBar';
import { PaymentRequestApprovalPreview } from '../management/PaymentRequestApprovalPreview';
import { RegisterSettlementApprovalPreview } from '../management/RegisterSettlementApprovalPreview';
import { ApproveRejectConfirmBar } from '../management/ApproveRejectConfirmBar';
import { ZareApprovalHint } from '../ZareApprovalHint';
import {
  execReviewHeadline,
  execWorkItemReviewContext,
  resolveExecReviewView,
  resolveExecSettlementId,
} from '../../lib/execWorkItemReview';
import { canApproveProductionGate, productionGateOverrideNoteValid } from '../../lib/productionGateAccess';
import { userMayApproveRefundRequests } from '../../lib/refundsStore';
import { isExecutiveRoleKey, userMayPerformManagerQuotationClearance, userMayWriteOffReceivableBadDebt } from '../../lib/workspaceGovernanceClient';
import { RECEIVABLE_WRITEOFF_NOTE_MIN_LEN } from '../../lib/receivableWriteOffPolicy';
import { StaffPurchaseCreditManagerPreview } from '../management/StaffPurchaseCreditManagerPreview';
import { OtApprovalDecisionModal } from '../branchManager/OtApprovalDecisionModal';
import { EditApprovalDetailModal } from '../branchManager/EditApprovalDetailModal';
import MaterialIncidentDetailModal from '../material/MaterialIncidentDetailModal';
import { OfficeThreadConversationDrawer } from '../office/OfficeThreadConversationDrawer';
import { ExecOfficeMemoDecisionBar } from './ExecOfficeMemoDecisionBar';
import { PayrollMdApprovalPreview } from './PayrollMdApprovalPreview';
import { InterBranchLoanApprovalPreview } from './InterBranchLoanApprovalPreview';
import { StockRegisterApprovalPreview } from './StockRegisterApprovalPreview';
import { decideStaffPurchaseCredit } from '../../lib/hrStaffPurchaseCredit';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit, canMdApprovePayroll } from '../../lib/hrAccess';
import { mdApprovePayrollRun } from '../../lib/hrExtended';
import { formatPersonName } from '../../lib/formatPersonName';
import {
  DecisionActionBar,
  DecisionBand,
  DecisionModalBody,
  DecisionModalHeader,
  DecisionWhatNext,
} from '../management/DecisionSurface';

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
  const [settlementDetail, setSettlementDetail] = useState(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementActionError, setSettlementActionError] = useState('');
  const [staffCreditRow, setStaffCreditRow] = useState(null);
  const [loadingStaffCredit] = useState(false);
  const [payrollTotals, setPayrollTotals] = useState(null);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [interBranchLoan, setInterBranchLoan] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loanRejectNote, setLoanRejectNote] = useState('');
  const [stockWorkflow, setStockWorkflow] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [materialDecisionRemark, setMaterialDecisionRemark] = useState('');
  const [paymentDetail, setPaymentDetail] = useState(null);

  const review = useMemo(() => resolveExecReviewView(item), [item]);
  const ctx = useMemo(() => execWorkItemReviewContext(item), [item]);
  const settlementId = useMemo(() => resolveExecSettlementId(item), [item]);
  const canApproveSettlements =
    ws?.hasPermission?.('finance.approve') ||
    ws?.hasPermission?.('refunds.approve') ||
    ws?.hasPermission?.('*');
  const canApproveProductionGateOverride = canApproveProductionGate(ws?.session?.user?.roleKey);
  const canWriteOffBadDebt = userMayWriteOffReceivableBadDebt(ws?.session?.user);
  const canManagerClearance = userMayPerformManagerQuotationClearance(ws?.session?.user);
  const canApproveRefunds = userMayApproveRefundRequests(ws);
  const canApproveStaffCredit = canApproveStaffPurchaseCredit(ws?.session?.user?.roleKey, ws?.permissions);
  const canRejectStaffCredit = canRejectStaffPurchaseCredit(ws?.session?.user?.roleKey, ws?.permissions);
  const canMdPayroll = canMdApprovePayroll(ws?.permissions);
  const canMdInterBranch =
    ws?.hasPermission?.('inter_branch_loan.md_approve') || ws?.hasPermission?.('*');
  const branchNameById = useMemo(() => {
    const map = {};
    const list = [...(ws?.snapshot?.branches || []), ...(ws?.session?.branches || [])];
    for (const b of list) {
      const id = String(b?.id || b?.branchId || '').trim();
      if (!id) continue;
      map[id] = b.name || b.branchName || id;
    }
    return map;
  }, [ws?.snapshot?.branches, ws?.session?.branches]);

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
    setAuditData(null);
    setRefundIntelExtras(null);
    setQuotationRow(null);
    setSettlementDetail(null);
    setSettlementNote('');
    setSettlementActionError('');
    setStaffCreditRow(null);
    setPayrollTotals(null);
    setInterBranchLoan(null);
    setLoanRejectNote('');
    setStockWorkflow(null);
    setMaterialDecisionRemark('');
    setPaymentDetail(null);

    if (review.view === 'register_settlement' && settlementId) {
      const hasSettlementPreview =
        review.row &&
        (review.row.amountNgn != null || review.row.amount_ngn != null || review.row.purpose);
      if (hasSettlementPreview) {
        setSettlementDetail(review.row);
      } else {
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
    }
    if (review.view === 'price_exception' && review.quotationId) {
      void Promise.all([fetchQuotation(review.quotationId), fetchAudit(review.quotationId)]);
    }
    if (review.view === 'quotation' && review.quotationId) {
      void fetchAudit(review.quotationId);
    }
    if (review.view === 'conversion' && review.row?.quotation_ref) {
      void fetchAudit(review.row.quotation_ref);
    }
    if (review.view === 'refund') {
      const qref = String(review.row?.quotation_ref || '').trim();
      const rid = String(review.row?.refund_id || review.refundId || '').trim();
      const auditPromise = qref ? fetchAudit(qref) : Promise.resolve();
      if (qref) {
        setLoadingRefundIntel(true);
        const qs = new URLSearchParams({ quotationRef: qref });
        if (rid) qs.set('excludeRefundId', rid);
        void Promise.all([
          auditPromise,
          apiFetch(`/api/refunds/intelligence?${qs.toString()}`).then(({ ok, data }) => {
            if (ok && data && data.ok !== false) setRefundIntelExtras(data);
          }),
        ]).finally(() => setLoadingRefundIntel(false));
      }
    }
    if (review.view === 'payment' && review.requestId) {
      void (async () => {
        const { ok, data } = await apiFetch(
          `/api/payment-requests/${encodeURIComponent(review.requestId)}`
        );
        if (ok && data?.request) setPaymentDetail(data.request);
      })();
    }
    if (review.view === 'staff_purchase_credit') {
      if (ctx.row?.id) {
        setStaffCreditRow(ctx.row);
      } else if (ctx.accountId) {
        setStaffCreditRow({ id: ctx.accountId, ...ctx.row });
      }
    }
    if (review.view === 'payroll' && review.payrollRunId) {
      setLoadingPayroll(true);
      void (async () => {
        const { ok, data } = await apiFetch(
          `/api/hr/payroll-runs/${encodeURIComponent(review.payrollRunId)}/totals`
        );
        setLoadingPayroll(false);
        if (ok && data?.ok) setPayrollTotals(data.totals);
      })();
    }
    if (review.view === 'inter_branch_loan' && review.loanId) {
      setLoadingLoan(true);
      void (async () => {
        const { ok, data } = await apiFetch(
          `/api/inter-branch-loans/${encodeURIComponent(review.loanId)}`
        );
        setLoadingLoan(false);
        if (ok && data?.ok) setInterBranchLoan(data.loan);
      })();
    }
    if (review.view === 'stock_register' && review.periodKey) {
      setLoadingStock(true);
      void (async () => {
        const { ok, data } = await apiFetch(
          `/api/stock-register/workflow?periodKey=${encodeURIComponent(review.periodKey)}`
        );
        setLoadingStock(false);
        if (ok && data?.ok) setStockWorkflow(data.workflow || data);
        else setStockWorkflow({ status: review.row?.status || 'unknown' });
      })();
    }
  }, [isOpen, item, review, settlementId, fetchAudit, fetchQuotation, ctx]);

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
              companyCutWaived: Boolean(decisionExtras.companyCutWaived),
              companyCutWaiverNote: String(decisionExtras.companyCutWaiverNote || '').trim(),
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

  const handleMaterialReject = async (incidentId) => {
    const id = String(incidentId || review.incidentId || '').trim();
    if (!id || readOnly) return;
    const remark = String(materialDecisionRemark || '').trim();
    if (remark.length < 3) {
      showToast('Enter a rejection reason in the remark field (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ managerRemark: remark, note: remark, reason: remark }),
      });
      if (!ok || data?.ok === false) {
        showToast(data?.error || 'Could not reject material incident.', { variant: 'error' });
        return;
      }
      showToast('Material incident rejected.', { variant: 'success' });
      setMaterialDecisionRemark('');
      await ws?.refresh?.();
      await finish();
    } finally {
      setBusy(false);
    }
  };

  const handleMaterialApprove = async (incidentId) => {
    const id = String(incidentId || review.incidentId || '').trim();
    if (!id || readOnly) return;
    const remark = String(materialDecisionRemark || '').trim() || 'Approved — stock damage report posted.';
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ managerRemark: remark }),
      });
      if (!ok || data?.ok === false) {
        showToast(data?.error || 'Could not approve material incident.', { variant: 'error' });
        return;
      }
      showToast('Material incident approved.', { variant: 'success' });
      setMaterialDecisionRemark('');
      await ws?.refresh?.();
      await finish();
    } finally {
      setBusy(false);
    }
  };

  const handleStaffCreditDecision = async (decision, note = '') => {
    const id = ctx.accountId;
    if (!id || readOnly) return;
    if (decision === 'reject' && String(note || '').trim().length < 3) {
      showToast('Rejection reason is required (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    const { ok, data: resp } = await decideStaffPurchaseCredit(id, decision, {
      note:
        decision === 'approve'
          ? String(note || '').trim() || 'Approved by MD (Command Centre)'
          : String(note || '').trim(),
    });
    setBusy(false);
    if (!ok || !resp?.ok) {
      showToast(resp?.error || 'Action failed.', { variant: 'error' });
      return;
    }
    showToast(decision === 'approve' ? 'Staff purchase credit approved.' : 'Staff purchase credit rejected.', {
      variant: 'success',
    });
    await ws?.refresh?.();
    await ws?.refreshStaffPurchaseCreditPending?.();
    await finish();
  };

  const handlePayrollMdApprove = async () => {
    const runId = review.payrollRunId;
    if (!runId || readOnly || !canMdPayroll) return;
    setBusy(true);
    const { ok, data } = await mdApprovePayrollRun(runId);
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not sign off payroll.', { variant: 'error' });
      return;
    }
    showToast('Payroll MD sign-off recorded.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleInterBranchMdApprove = async () => {
    const loanId = review.loanId;
    if (!loanId || readOnly || !canMdInterBranch) return;
    setBusy(true);
    const { ok, data } = await apiFetch(
      `/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-approve`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Approval failed.', { variant: 'error' });
      return;
    }
    showToast('Inter-branch loan approved.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  const handleInterBranchMdReject = async () => {
    const loanId = review.loanId;
    if (!loanId || readOnly || !canMdInterBranch) return;
    const note = loanRejectNote.trim();
    if (note.length < 3) {
      showToast('Rejection note required (at least 3 characters).', { variant: 'error' });
      return;
    }
    setBusy(true);
    const { ok, data } = await apiFetch(
      `/api/inter-branch-loans/${encodeURIComponent(loanId)}/md-reject`,
      { method: 'POST', body: JSON.stringify({ note }) }
    );
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Rejection failed.', { variant: 'error' });
      return;
    }
    showToast('Inter-branch loan rejected.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  if (!item) return null;

  if (review.view === 'material') {
    return (
      <MaterialIncidentDetailModal
        isOpen={isOpen}
        incidentId={review.incidentId}
        canApprove={!readOnly && item.canAct !== false}
        managerRemark={materialDecisionRemark}
        onManagerRemarkChange={setMaterialDecisionRemark}
        onClose={onClose}
        onApprove={handleMaterialApprove}
        onReject={handleMaterialReject}
        externalBusy={busy}
      />
    );
  }

  if (review.view === 'edit_approval') {
    return (
      <EditApprovalDetailModal
        isOpen={isOpen}
        editApprovalId={review.editApprovalId}
        inboxRow={review.row}
        onClose={onClose}
        onDecisionComplete={async () => {
          await ws?.refresh?.();
          if (typeof onCompleted === 'function') await onCompleted();
        }}
        canApprove={!readOnly && item.canAct !== false}
      />
    );
  }

  const kindLabel = execReviewHeadline(review.view, item);
  const reasons = ctx.reasons;
  const isOfficeMemo = review.view === 'office_memo';
  const headerIcon =
    review.view === 'conversion'
      ? Scale
      : review.view === 'payment' || review.view === 'register_settlement' || review.view === 'refund'
        ? Banknote
        : review.view === 'payroll'
          ? Wallet
          : review.view === 'inter_branch_loan'
            ? ArrowLeftRight
            : review.view === 'stock_register'
              ? Package
              : review.view === 'price_exception'
                ? Tag
                : History;

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} surface="plain" title={`Executive review — ${kindLabel}`} edgeToEdgeMobile showCloseButton={false}>
      <div
        className={`z-modal-panel flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-white shadow-xl max-sm:h-[100dvh] max-sm:max-h-[100dvh] ${
          isOfficeMemo
            ? 'max-w-[min(100%,960px)]'
            : review.view === 'refund' || review.view === 'quotation'
              ? 'max-w-[min(100%,896px)]'
              : 'max-w-[min(100%,720px)]'
        }`}
      >
        {isOfficeMemo ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">Office memo</p>
            <h2 className="text-base font-bold text-slate-900 truncate">{item.title || 'Memo'}</h2>
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
        ) : (
        <>
          <DecisionModalHeader title={kindLabel} onClose={onClose} busy={busy} icon={headerIcon} />
          <div className="border-b border-slate-100 bg-white px-4 py-2.5">
            <h2 className="truncate text-sm font-black text-slate-900">{item.title || 'Review'}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {[
                item.branchName,
                item.amountNgn != null ? formatNgn(item.amountNgn) : '',
                item.requestedBy,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            {reasons.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 text-ui-xs text-amber-900/90 list-disc pl-4">
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
        )}

        {isOfficeMemo ? (
        <div className="min-h-[420px] flex-1 overflow-y-auto custom-scrollbar">
          {review.threadId ? (
            <OfficeThreadConversationDrawer
              variant="inline"
              isOpen={isOpen}
              threadId={review.threadId}
              onDismiss={() => {
                void onCompleted?.();
                onClose();
              }}
            />
          ) : null}
        </div>
        ) : (
        <DecisionModalBody>
          {review.view === 'price_exception' && review.quotationId ? (
            <QuotationPriceExceptionPanel
              layout="desk"
              quotationId={review.quotationId}
              quotation={quotationRow}
              onQuotationUpdated={(q) => {
                setQuotationRow(q);
                ws?.mergeQuotationIntoSnapshot?.(q);
                if (quotationBelowFloorExceptionApproved(q)) {
                  void finish();
                }
              }}
            />
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
                canManagerClearance={!readOnly && canManagerClearance}
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
                onReleasePayments={async () => {
                  if (await appConfirm({ message: 'Release payment hold on this quotation?' })) {
                    void handleQuotationReview(review.quotationId, 'release_payments');
                  }
                }}
                onWaiveBalance={async () => {
                  if (
                    await appConfirm({
                      message:
                        'Waive the small round-off within payment tolerance (max ₦5,000)? It will be removed from Creditors receivables.',
                    })
                  ) {
                    void handleQuotationReview(review.quotationId, 'waive_balance');
                  }
                }}
                onWriteOffReceivable={() => {
                  void handleQuotationReview(review.quotationId, 'write_off_receivable');
                }}
                onProductionOverride={() => void handleQuotationReview(review.quotationId, 'approve_production')}
              />
            </>
          ) : null}

          {review.view === 'conversion' ? (
            <div className="space-y-4">
              <ConversionReviewApprovalPreview
                jobId={review.jobId}
                inboxRow={review.row}
                auditData={auditData}
                loading={loadingAudit}
                formatPersonName={formatPersonName}
              />
              {!readOnly && item.canAct !== false ? (
                <ConversionReviewConfirmBar
                  asSticky={false}
                  jobId={review.jobId}
                  remark={conversionRemark}
                  onRemarkChange={setConversionRemark}
                  busy={busy}
                  alertState={review.row?.conversion_alert_state || review.row?.conversionAlertState}
                  confirmLabel="Confirm production check"
                  hint="This records your sign-off on the conversion check."
                  onConfirm={() => void handleConversionSignoff()}
                />
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
            <div className="space-y-4">
              {!canApproveSettlements ? (
                <ZareApprovalHint
                  context={{
                    referenceNo: settlementId || review.settlementId,
                    documentType: 'register_settlement',
                    status: (settlementDetail || review.row)?.status || 'Pending',
                    canApprove: false,
                    missingPermission:
                      'Register withdrawal approval requires finance.approve or refunds.approve.',
                  }}
                />
              ) : null}
              {loadingSettlement && !settlementDetail && !review.row?.settlementId ? (
                <p className="text-xs text-slate-500">Loading withdrawal details…</p>
              ) : (
                <RegisterSettlementApprovalPreview
                  settlementId={settlementId || review.settlementId}
                  row={{
                    ...(settlementDetail || review.row || {}),
                    partyName:
                      (settlementDetail || review.row)?.partyName ||
                      (settlementDetail || review.row)?.party_name ||
                      item?.reviewContext?.subtitle,
                    amountNgn:
                      (settlementDetail || review.row)?.amountNgn ??
                      (settlementDetail || review.row)?.amount_ngn ??
                      item?.amountNgn,
                  }}
                  formatNgn={formatNgn}
                />
              )}
              {!readOnly && canApproveSettlements ? (
                <ApproveRejectConfirmBar
                  asSticky={false}
                  hint="Reject keeps this cash on the register."
                  restatement={`Approve pays out ${formatNgn(
                    (settlementDetail || review.row)?.amountNgn ?? item?.amountNgn
                  )}.`}
                  busy={busy}
                  canApprove={Boolean(settlementId || review.settlementId)}
                  canReject={Boolean(settlementId || review.settlementId)}
                  approveLabel="Approve withdrawal"
                  rejectLabel="Reject"
                  resetKey={settlementId || review.settlementId}
                  note={settlementNote}
                  onNoteChange={setSettlementNote}
                  onApprove={() => void handleSettlementDecision('Approved')}
                  onReject={() => void handleSettlementDecision('Rejected')}
                >
                  {settlementActionError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                      {settlementActionError}
                    </p>
                  ) : null}
                </ApproveRejectConfirmBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'payment' ? (
            <div className="space-y-4">
              <PaymentRequestApprovalPreview
                requestId={review.requestId}
                row={{ ...(review.row || {}), ...(paymentDetail || {}) }}
                formatNgn={formatNgn}
              />
              {!readOnly && item.canAct !== false ? (
                <ApproveRejectConfirmBar
                  asSticky={false}
                  hint="Reject returns the request so the requester can correct it."
                  restatement={`Approve sends ${formatNgn(
                    paymentDetail?.amount_requested_ngn ??
                      paymentDetail?.amountRequestedNgn ??
                      review.row?.amount_requested_ngn ??
                      review.row?.amountRequestedNgn
                  )} to Cashier.`}
                  busy={busy}
                  approveLabel="Approve request"
                  rejectLabel="Reject"
                  resetKey={review.requestId}
                  onApprove={() => void handlePaymentDecision('Approved')}
                  onReject={() => void handlePaymentDecision('Rejected')}
                />
              ) : null}
            </div>
          ) : null}

          {review.view === 'overtime' && review.otRequestId ? (
            <OtApprovalDecisionModal
              variant="inline"
              isOpen={isOpen}
              requestId={review.otRequestId}
              readOnly={readOnly || item.canAct === false}
              onClose={() => {}}
              onDecisionComplete={() => void finish()}
            />
          ) : null}

          {review.view === 'integrity' ? (
            <div className="space-y-3">
              <DecisionBand
                tone="flagged"
                eyebrow="Governance"
                title={item.title || 'Needs attention'}
                subtitle={item.branchName || review.branchId || null}
              >
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {review.integrityKind === 'missing_branch_manager'
                    ? 'This branch has no Branch Manager assigned. Complaints, overtime, and other branch workflows fall back without an owner. Assign a Branch Manager in Settings → Team & access. This item leaves the queue once someone is assigned.'
                    : 'This item is on the MD attention list for oversight. Use the linked desk if a further operational action is required.'}
                </p>
              </DecisionBand>
              {review.integrityKind === 'missing_branch_manager' ? (
                <DecisionWhatNext title="Next step">
                  Open Team &amp; access and assign a sales_manager (Branch Manager) to this branch.
                </DecisionWhatNext>
              ) : null}
              <DecisionActionBar>
                <a
                  href="/settings/team"
                  className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-4 py-2.5 text-ui-xs font-black uppercase tracking-widest text-white hover:brightness-105"
                >
                  Open Team &amp; access
                </a>
              </DecisionActionBar>
            </div>
          ) : null}

          {review.view === 'staff_purchase_credit' ? (
            loadingStaffCredit && !staffCreditRow ? (
              <p className="text-xs text-slate-500">Loading staff purchase credit…</p>
            ) : (
              <StaffPurchaseCreditManagerPreview
                row={staffCreditRow || review.row}
                formatNgn={formatNgn}
                canApprove={!readOnly && canApproveStaffCredit}
                canReject={!readOnly && canRejectStaffCredit}
                busy={busy}
                onApprove={() => void handleStaffCreditDecision('approve')}
                onReject={(note) => void handleStaffCreditDecision('reject', note)}
              />
            )
          ) : null}

          {review.view === 'payroll' ? (
            <div className="space-y-4">
              <PayrollMdApprovalPreview
                payrollRunId={review.payrollRunId}
                row={review.row}
                totals={payrollTotals}
                loading={loadingPayroll}
                formatNgn={formatNgn}
              />
              {!readOnly && canMdPayroll ? (
                <ApproveRejectConfirmBar
                  asSticky={false}
                  canReject={false}
                  hint="Signing off records MD approval so finance can pay. It does not itself send money to staff."
                  restatement={
                    payrollTotals
                      ? `Sign-off authorises net ${formatNgn(
                          payrollTotals.netPayNgn ??
                            payrollTotals.totalNetNgn ??
                            payrollTotals.grandTotalNgn ??
                            payrollTotals.netTotalNgn ??
                            payrollTotals.netNgn ??
                            0
                        )}${
                          payrollTotals.headcount != null ? ` for ${payrollTotals.headcount} staff` : ''
                        }.`
                      : ''
                  }
                  acknowledgeLabel="I have reviewed headcount and net payable for this payroll run."
                  approveLabel="Sign off payroll"
                  busy={busy}
                  resetKey={review.payrollRunId}
                  onApprove={() => void handlePayrollMdApprove()}
                />
              ) : null}
            </div>
          ) : null}

          {review.view === 'inter_branch_loan' ? (
            <div className="space-y-4">
              <InterBranchLoanApprovalPreview
                loanId={review.loanId}
                loan={interBranchLoan}
                row={review.row}
                loading={loadingLoan}
                formatNgn={formatNgn}
                branchNameById={branchNameById}
              />
              {!readOnly && canMdInterBranch ? (
                <ApproveRejectConfirmBar
                  asSticky={false}
                  hint="Reject returns the request without a treasury transfer."
                  restatement={`Approve moves ${formatNgn(
                    interBranchLoan?.principalNgn ?? review.row?.principalNgn ?? item.amountNgn
                  )} to the borrowing branch.`}
                  approveLabel="Approve loan"
                  rejectLabel="Reject"
                  busy={busy}
                  resetKey={review.loanId}
                  note={loanRejectNote}
                  onNoteChange={setLoanRejectNote}
                  onApprove={() => void handleInterBranchMdApprove()}
                  onReject={() => void handleInterBranchMdReject()}
                />
              ) : null}
            </div>
          ) : null}

          {review.view === 'stock_register' ? (
            <div className="space-y-4">
              <StockRegisterApprovalPreview
                periodKey={review.periodKey}
                branchLabel={item.branchName || review.branchIdForRegister}
                status={stockWorkflow?.status}
                loading={loadingStock}
              />
            </div>
          ) : null}

          {review.view === 'quotation' && !review.quotationId ? (
            <p className="text-xs text-slate-600">
              This queue item is missing a quotation reference, so Clear / Flag cannot run here. Open Sales to
              complete the review.
            </p>
          ) : null}

          {review.view === 'fallback' ? (
            <div className="space-y-3">
              <DecisionWhatNext title="Next step">
                This item type does not have an in-page decision yet. Open the linked desk to clear, flag, or approve
                it.
              </DecisionWhatNext>
              {item.route ? (
                <a
                  href={item.route}
                  className="inline-flex items-center justify-center rounded-lg bg-zarewa-teal px-4 py-2.5 text-ui-xs font-black uppercase tracking-widest text-white hover:brightness-105"
                >
                  Open linked desk
                </a>
              ) : null}
            </div>
          ) : null}
        </DecisionModalBody>
        )}

        {isOfficeMemo && review.threadId && !readOnly ? (
          <ExecOfficeMemoDecisionBar
            threadId={review.threadId}
            workItemId={review.relatedWorkItemId}
            onCompleted={() => void finish()}
          />
        ) : null}
      </div>
    </ModalFrame>
  );
}
