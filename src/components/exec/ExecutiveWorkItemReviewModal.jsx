import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Factory, Flag, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { QuotationPriceExceptionPanel } from '../QuotationPriceExceptionPanel';
import { ClearanceManagerApprovalPreview } from '../management/ClearanceManagerApprovalPreview';
import { RefundManagerApprovalPreview } from '../management/RefundManagerApprovalPreview';
import { ManagementAuditSections } from '../management/ManagementAuditSections';
import { ConversionRecordPanel } from '../management/ConversionRecordPanel';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { execWorkItemReviewContext, resolveExecReviewView, resolveExecSettlementId } from '../../lib/execWorkItemReview';
import { canApproveProductionGate, productionGateOverrideNoteValid } from '../../lib/productionGateAccess';
import { userMayApproveRefundRequests } from '../../lib/refundsStore';
import { isExecutiveRoleKey, userMayWriteOffReceivableBadDebt } from '../../lib/workspaceGovernanceClient';
import { RECEIVABLE_WRITEOFF_NOTE_MIN_LEN } from '../../lib/receivableWriteOffPolicy';
import { StaffPurchaseCreditManagerPreview } from '../management/StaffPurchaseCreditManagerPreview';
import { OfficeThreadConversationDrawer } from '../office/OfficeThreadConversationDrawer';
import { decideStaffPurchaseCredit } from '../../lib/hrStaffPurchaseCredit';
import { canApproveStaffPurchaseCredit, canRejectStaffPurchaseCredit, canMdApprovePayroll } from '../../lib/hrAccess';
import { mdApprovePayrollRun } from '../../lib/hrExtended';
import { postStockRegisterWorkflow } from '../reports/stockRegister/stockRegisterApi';
import { formatPeriodYyyymm } from '../../lib/hrPayroll';
import { formatPersonName } from '../../lib/formatPersonName';
import {
  DecisionActionBar,
  DecisionActionTile,
  DecisionBand,
  DecisionChip,
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
  const [conversionEditApprovalId, setConversionEditApprovalId] = useState('');
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
  const canApproveStaffCredit = canApproveStaffPurchaseCredit(ws?.session?.user?.roleKey, ws?.permissions);
  const canRejectStaffCredit = canRejectStaffPurchaseCredit(ws?.session?.user?.roleKey, ws?.permissions);
  const canMdPayroll = canMdApprovePayroll(ws?.permissions);
  const canMdInterBranch =
    ws?.hasPermission?.('inter_branch_loan.md_approve') || ws?.hasPermission?.('*');

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
    setStaffCreditRow(null);
    setPayrollTotals(null);
    setInterBranchLoan(null);
    setLoanRejectNote('');
    setStockWorkflow(null);

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

  const handleStockRegisterMdApprove = async () => {
    const periodKey = review.periodKey;
    if (!periodKey || readOnly) return;
    const branchHint = review.branchIdForRegister;
    if (ws?.viewAllBranches) {
      showToast(
        `Switch workspace to branch ${branchHint || 'for this register'} before MD approval.`,
        { variant: 'info' }
      );
      return;
    }
    setBusy(true);
    const { ok, data } = await postStockRegisterWorkflow({ action: 'md_approve', periodKey });
    setBusy(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'MD stock register approval failed.', { variant: 'error' });
      return;
    }
    showToast('Stock register MD approval recorded.', { variant: 'success' });
    await ws?.refresh?.();
    await finish();
  };

  if (!item) return null;

  const kindLabel = String(item.kind || 'review').replace(/_/g, ' ');
  const reasons = ctx.reasons;
  const isOfficeMemo = review.view === 'office_memo';

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} surface="plain" title={`Executive review — ${kindLabel}`} edgeToEdgeMobile>
      <div
        className={`z-modal-panel flex max-h-[min(92vh,880px)] w-full flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-white shadow-xl max-sm:h-[100dvh] max-sm:max-h-[100dvh] ${
          isOfficeMemo ? 'max-w-[min(100%,960px)]' : 'max-w-[min(100%,720px)]'
        }`}
      >
        {!isOfficeMemo ? (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal">{kindLabel}</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 truncate">{item.title || 'Review'}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {item.branchName || '—'}
              {item.amountNgn != null ? ` · ${formatNgn(item.amountNgn)}` : ''}
              {item.requestedBy ? ` · ${item.requestedBy}` : ''}
            </p>
            {reasons.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-ui-xs text-amber-900/90 list-disc pl-4">
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
        ) : (
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
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isOfficeMemo ? 'min-h-[420px]' : 'p-5 space-y-4'}`}>
          {review.view === 'office_memo' && review.threadId ? (
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

          {!isOfficeMemo ? (
          <>
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
              <DecisionBand
                tone="convert"
                eyebrow="Conversion review"
                title={review.jobId}
                subtitle={formatPersonName(review.row?.customer_name)}
                meta={
                  <>
                    <DecisionChip>Alert: {review.row?.conversion_alert_state || '—'}</DecisionChip>
                    {review.row?.manager_review_required ? (
                      <DecisionChip tone="amber">Manager review</DecisionChip>
                    ) : null}
                  </>
                }
              >
                {review.row?.product_name ? (
                  <p className="mt-1 text-ui-xs text-slate-500">{review.row.product_name}</p>
                ) : null}
              </DecisionBand>
              <ConversionRecordPanel
                auditData={auditData}
                loading={loadingAudit}
                focusJobId={review.jobId}
                emptyMessage="No coil or conversion check found for this job yet."
              />
              {!readOnly && item.canAct !== false ? (
                <DecisionActionBar>
                  <p className="text-ui-xs leading-relaxed text-slate-600">
                    Confirm you have reviewed high/low conversion variance for this completed job.
                  </p>
                  <textarea
                    value={conversionRemark}
                    onChange={(e) => setConversionRemark(e.target.value)}
                    rows={2}
                    placeholder="Sign-off remark (min. 3 characters)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-300/50"
                  />
                  {review.jobId ? (
                    <EditSecondApprovalInline
                      entityKind="production_job"
                      entityId={review.jobId}
                      value={conversionEditApprovalId}
                      onChange={setConversionEditApprovalId}
                    />
                  ) : null}
                  <DecisionActionTile
                    variant="brand"
                    icon={Factory}
                    label="Sign off conversion review"
                    disabled={busy}
                    onClick={() => void handleConversionSignoff()}
                  />
                </DecisionActionBar>
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
              <DecisionBand
                tone="payment"
                eyebrow="Register withdrawal"
                title={settlementId || review.settlementId || '—'}
                subtitle={
                  (settlementDetail || review.row)?.partyName || item?.reviewContext?.subtitle || null
                }
                aside={
                  <>
                    <p className="text-ui-xs font-bold uppercase text-slate-400">Amount</p>
                    <p className="text-lg font-black tabular-nums text-zarewa-teal">
                      {formatNgn((settlementDetail || review.row)?.amountNgn ?? item?.amountNgn)}
                    </p>
                  </>
                }
              >
                {!canApproveSettlements ? (
                  <div className="mt-2">
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
                  </div>
                ) : null}
                {loadingSettlement && !settlementDetail && !review.row?.settlementId ? (
                  <p className="mt-2 text-xs text-slate-500">Loading withdrawal details…</p>
                ) : (
                  <>
                    {(settlementDetail || review.row)?.registerLineId ? (
                      <p className="mt-1 font-mono text-ui-xs text-slate-500">
                        {(settlementDetail || review.row).registerLineId}
                      </p>
                    ) : null}
                    {(settlementDetail || review.row)?.reason ? (
                      <p className="mt-2 text-xs text-slate-600 rounded-lg bg-white border border-slate-100 px-3 py-2">
                        {(settlementDetail || review.row).reason}
                      </p>
                    ) : null}
                    {(settlementDetail || review.row)?.requestedByName ? (
                      <p className="mt-1 text-ui-xs text-slate-500">
                        Requested by {formatPersonName((settlementDetail || review.row).requestedByName)}
                      </p>
                    ) : null}
                  </>
                )}
              </DecisionBand>
              {!readOnly && canApproveSettlements ? (
                <DecisionActionBar>
                  {settlementActionError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                      {settlementActionError}
                    </p>
                  ) : null}
                  <textarea
                    value={settlementNote}
                    onChange={(e) => setSettlementNote(e.target.value)}
                    rows={2}
                    placeholder="Approval or rejection note (required for rejection)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-300/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <DecisionActionTile
                      variant="compactApprove"
                      icon={CheckCircle2}
                      label={busy ? 'Saving…' : 'Approve'}
                      disabled={busy || (!settlementId && !review.settlementId)}
                      onClick={() => void handleSettlementDecision('Approved')}
                    />
                    <DecisionActionTile
                      variant="compactReject"
                      icon={Flag}
                      label={busy ? 'Saving…' : 'Reject'}
                      disabled={busy || (!settlementId && !review.settlementId)}
                      onClick={() => void handleSettlementDecision('Rejected')}
                    />
                  </div>
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'payment' ? (
            <div className="space-y-4">
              <DecisionBand
                tone="payment"
                eyebrow="Payment request"
                title={review.requestId}
                subtitle={review.row?.description}
                aside={
                  <>
                    <p className="text-ui-xs font-bold uppercase text-slate-400">Amount</p>
                    <p className="text-lg font-black tabular-nums text-zarewa-teal">
                      {formatNgn(review.row?.amount_requested_ngn)}
                    </p>
                  </>
                }
              >
                {review.row?.expense_category ? (
                  <p className="mt-1 text-ui-xs text-slate-500">{review.row.expense_category}</p>
                ) : null}
              </DecisionBand>
              {!readOnly && item.canAct !== false ? (
                <DecisionActionBar>
                  <div className="grid grid-cols-2 gap-2">
                    <DecisionActionTile
                      variant="compactApprove"
                      icon={CheckCircle2}
                      label="Approve"
                      disabled={busy}
                      onClick={() => void handlePaymentDecision('Approved')}
                    />
                    <DecisionActionTile
                      variant="compactReject"
                      icon={Flag}
                      label="Reject"
                      disabled={busy}
                      onClick={() => void handlePaymentDecision('Rejected')}
                    />
                  </div>
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'material' ? (
            <div className="space-y-3">
              <DecisionBand
                tone="material"
                eyebrow="Material exception"
                title={review.incidentId}
                subtitle={
                  [review.row?.incident_type || 'Incident', review.row?.gauge_label, review.row?.colour]
                    .filter(Boolean)
                    .join(' · ') || null
                }
              />
              {!readOnly && item.canAct !== false ? (
                <DecisionActionBar>
                  <DecisionActionTile
                    variant="brand"
                    label="Approve incident"
                    disabled={busy}
                    onClick={() => void handleMaterialApprove()}
                  />
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'edit_approval' ? (
            <div className="space-y-3">
              <DecisionBand
                tone="edit"
                eyebrow="Edit approval"
                title={review.row?.entityId || '—'}
                subtitle={review.row?.entityKind || null}
              >
                <p className="mt-1 text-ui-xs text-slate-600">
                  Requested by {review.row?.requestedByDisplay || review.row?.requestedByUserId || '—'}
                </p>
              </DecisionBand>
              {!readOnly && item.canAct !== false ? (
                <DecisionActionBar>
                  <DecisionActionTile
                    variant="brand"
                    className="!bg-violet-700 hover:!bg-violet-800"
                    label="Approve edit"
                    disabled={busy}
                    onClick={() => void handleEditApproval()}
                  />
                </DecisionActionBar>
              ) : null}
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
              <DecisionBand
                tone="production"
                eyebrow="Payroll MD sign-off"
                title={review.payrollRunId}
                subtitle={`Period ${formatPeriodYyyymm(review.row?.period_yyyymm || review.row?.periodYyyymm || review.payrollRunId)}`}
                aside={
                  !loadingPayroll && payrollTotals ? (
                    <>
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Net</p>
                      <p className="text-lg font-black tabular-nums text-zarewa-teal">
                        {formatNgn(
                          payrollTotals.netPayNgn ?? payrollTotals.totalNetNgn ?? payrollTotals.grandTotalNgn ?? 0
                        )}
                      </p>
                    </>
                  ) : null
                }
              >
                {loadingPayroll ? <p className="mt-1 text-xs text-slate-500">Loading payroll totals…</p> : null}
              </DecisionBand>
              {!readOnly && canMdPayroll ? (
                <DecisionActionBar>
                  <DecisionActionTile
                    variant="brand"
                    label="Sign off payroll"
                    disabled={busy}
                    onClick={() => void handlePayrollMdApprove()}
                  />
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'inter_branch_loan' ? (
            <div className="space-y-4">
              <DecisionBand
                tone="credit"
                eyebrow="Inter-branch loan"
                title={review.loanId}
                subtitle={interBranchLoan?.purpose || review.row?.purpose || null}
                aside={
                  !loadingLoan && (interBranchLoan || item.amountNgn != null) ? (
                    <>
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Principal</p>
                      <p className="text-lg font-black tabular-nums text-zarewa-teal">
                        {formatNgn(interBranchLoan?.principalNgn ?? item.amountNgn)}
                      </p>
                    </>
                  ) : null
                }
              >
                {loadingLoan ? <p className="mt-1 text-xs text-slate-500">Loading loan…</p> : null}
              </DecisionBand>
              {!readOnly && canMdInterBranch ? (
                <DecisionActionBar>
                  <textarea
                    value={loanRejectNote}
                    onChange={(e) => setLoanRejectNote(e.target.value)}
                    rows={2}
                    placeholder="Rejection note (required to reject)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-300/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <DecisionActionTile
                      variant="compactApprove"
                      label="Approve"
                      disabled={busy}
                      onClick={() => void handleInterBranchMdApprove()}
                    />
                    <DecisionActionTile
                      variant="compactReject"
                      label="Reject"
                      disabled={busy}
                      onClick={() => void handleInterBranchMdReject()}
                    />
                  </div>
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'stock_register' ? (
            <div className="space-y-4">
              <DecisionBand
                tone="payment"
                eyebrow="Month-end stock register"
                title={review.periodKey || '—'}
                subtitle={review.branchIdForRegister || item.branchName || null}
              >
                {ws?.viewAllBranches ? (
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Switch workspace from <strong>All branches</strong> to{' '}
                    <strong>{review.branchIdForRegister || 'this branch'}</strong> in the branch bar, then approve.
                  </p>
                ) : null}
                {loadingStock ? (
                  <p className="mt-1 text-xs text-slate-500">Loading register workflow…</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-700">
                    Status: {String(stockWorkflow?.status || '—').replace(/_/g, ' ')}
                  </p>
                )}
              </DecisionBand>
              {!readOnly && item.canAct !== false ? (
                <DecisionActionBar>
                  <DecisionActionTile
                    variant="brand"
                    label="MD approve register"
                    disabled={busy || ws?.viewAllBranches || stockWorkflow?.status !== 'procurement_costed'}
                    onClick={() => void handleStockRegisterMdApprove()}
                  />
                </DecisionActionBar>
              ) : null}
            </div>
          ) : null}

          {review.view === 'fallback' ? (
            <p className="text-xs text-slate-600">
              Open the linked module to complete this review.
            </p>
          ) : null}
          </>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
          {!isOfficeMemo && review.view === 'fallback' && item.route ? (
            <a
              href={item.route}
              className="rounded-lg border border-zarewa-teal/30 bg-zarewa-teal/5 px-4 py-2 text-ui-xs font-black uppercase text-zarewa-teal hover:bg-zarewa-teal/10"
            >
              Open module
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-ui-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
