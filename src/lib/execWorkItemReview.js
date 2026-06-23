/** Work tray kinds that open the executive in-page review modal instead of navigating away. */
const EXEC_IN_MODAL_KINDS = new Set([
  'price_exception',
  'conversions',
  'refunds',
  'register_settlement',
  'payments',
  'clearance',
  'flagged',
  'production',
  'governance',
  'material',
  'edit_approvals',
  'staff_purchase_credit',
  'payroll',
  'inter_branch_loan',
  'stock_register',
  'office_memo',
]);

/**
 * @param {string | null | undefined} kind
 * @param {{ summaryOnly?: boolean }} [item]
 */
export function execWorkItemOpensInModal(kind, item = {}) {
  if (item?.summaryOnly) return false;
  return EXEC_IN_MODAL_KINDS.has(String(kind || '').trim().toLowerCase());
}

/**
 * @param {object | null | undefined} item
 */
export function resolveExecSettlementId(item) {
  const ctx = item?.reviewContext && typeof item.reviewContext === 'object' ? item.reviewContext : {};
  const row = ctx.row && typeof ctx.row === 'object' ? ctx.row : {};
  const fromId = String(item?.id || '').trim();
  const idMatch = fromId.match(/^register_settlement:(.+)$/i);
  const title = String(item?.title || '').trim();
  let fromTitle = '';
  if (/^SET-/i.test(title)) {
    fromTitle = title;
  } else {
    const m = title.match(/register\s+withdrawal\s+(.+)/i);
    if (m) fromTitle = String(m[1] || '').trim();
  }
  return String(
    ctx.settlementId ||
      row.settlementId ||
      row.settlement_id ||
      item?.settlementId ||
      item?.sourceId ||
      (idMatch ? idMatch[1] : '') ||
      fromTitle
  ).trim();
}

/**
 * @param {object | null | undefined} item
 */
export function execWorkItemReviewContext(item) {
  const ctx = item?.reviewContext && typeof item.reviewContext === 'object' ? item.reviewContext : {};
  const row = ctx.row && typeof ctx.row === 'object' ? ctx.row : {};
  const settlementId = resolveExecSettlementId(item);
  const fromId = String(item?.id || '').trim();
  const staffCreditMatch = fromId.match(/^staff_purchase_credit:(.+)$/i);
  const payrollMatch = fromId.match(/^payroll:(.+)$/i);
  const iblMatch = fromId.match(/^ibl:(.+)$/i);
  const stockMatch = fromId.match(/^stockreg:([^:]+):(.+)$/i);
  const officeMatch = fromId.match(/^office:(.+)$/i);
  return {
    quotationRef: String(item?.quotationRef || ctx.quotationRef || row.id || row.quotation_ref || '').trim(),
    jobId: String(ctx.jobId || row.job_id || '').trim(),
    refundId: String(ctx.refundId || row.refund_id || row.refundId || '').trim(),
    settlementId,
    requestId: String(ctx.requestId || row.request_id || '').trim(),
    cuttingListId: String(ctx.cuttingListId || row.id || '').trim(),
    materialIncidentId: String(ctx.materialIncidentId || row.id || '').trim(),
    editApprovalId: String(ctx.editApprovalId || row.id || '').trim(),
    accountId: String(ctx.accountId || row.id || (staffCreditMatch ? staffCreditMatch[1] : '') || '').trim(),
    payrollRunId: String(
      ctx.payrollRunId || row.id || row.run_id || (payrollMatch ? payrollMatch[1] : '') || ''
    ).trim(),
    loanId: String(ctx.loanId || row.loan_id || (iblMatch ? iblMatch[1] : '') || '').trim(),
    periodKey: String(
      ctx.periodKey || row.periodKey || row.period_key || (stockMatch ? stockMatch[2] : '') || ''
    ).trim(),
    branchIdForRegister: String(
      ctx.branchIdForRegister || row.branch_id || item?.branchId || (stockMatch ? stockMatch[1] : '') || ''
    ).trim(),
    threadId: String(ctx.threadId || row.threadId || row.thread_id || (officeMatch ? officeMatch[1] : '') || '').trim(),
    reasons: Array.isArray(ctx.reasons) ? ctx.reasons : [],
    subtitle: String(ctx.subtitle || item?.requestedBy || '').trim(),
    row,
  };
}

/**
 * Normalize a work tray row into a review view key for the modal body.
 * @param {object | null | undefined} item
 */
export function resolveExecReviewView(item) {
  const kind = String(item?.kind || '').trim().toLowerCase();
  const ctx = execWorkItemReviewContext(item);

  if (kind === 'price_exception') {
    return { view: 'price_exception', quotationId: ctx.quotationRef };
  }
  if (kind === 'conversions') {
    return { view: 'conversion', jobId: ctx.jobId, row: ctx.row };
  }
  if (kind === 'refunds') {
    return { view: 'refund', refundId: ctx.refundId, row: ctx.row };
  }
  if (kind === 'register_settlement') {
    return { view: 'register_settlement', settlementId: ctx.settlementId || resolveExecSettlementId(item), row: ctx.row };
  }
  if (kind === 'payments') {
    return { view: 'payment', requestId: ctx.requestId, row: ctx.row };
  }
  if (kind === 'clearance') {
    return { view: 'quotation', quotationId: ctx.quotationRef, reviewContext: 'clearance', row: ctx.row };
  }
  if (kind === 'flagged') {
    return { view: 'quotation', quotationId: ctx.quotationRef, reviewContext: 'flagged', row: ctx.row };
  }
  if (kind === 'production') {
    return {
      view: 'quotation',
      quotationId: ctx.quotationRef,
      reviewContext: 'production',
      fromProductionGate: true,
      cuttingListId: ctx.cuttingListId,
      row: ctx.row,
    };
  }
  if (kind === 'governance') {
    if (ctx.refundId) {
      return { view: 'refund', refundId: ctx.refundId, row: ctx.row };
    }
    if (ctx.quotationRef) {
      return {
        view: 'quotation',
        quotationId: ctx.quotationRef,
        reviewContext: 'production',
        fromProductionGate: true,
        row: ctx.row,
      };
    }
  }
  if (kind === 'material') {
    return { view: 'material', incidentId: ctx.materialIncidentId || ctx.row.id, row: ctx.row };
  }
  if (kind === 'edit_approvals') {
    return { view: 'edit_approval', editApprovalId: ctx.editApprovalId || ctx.row.id, row: ctx.row };
  }
  if (kind === 'staff_purchase_credit') {
    return { view: 'staff_purchase_credit', accountId: ctx.accountId, row: ctx.row };
  }
  if (kind === 'payroll') {
    return { view: 'payroll', payrollRunId: ctx.payrollRunId, row: ctx.row };
  }
  if (kind === 'inter_branch_loan') {
    return { view: 'inter_branch_loan', loanId: ctx.loanId, row: ctx.row };
  }
  if (kind === 'stock_register') {
    return {
      view: 'stock_register',
      periodKey: ctx.periodKey,
      branchIdForRegister: ctx.branchIdForRegister,
      row: ctx.row,
    };
  }
  if (kind === 'office_memo') {
    return { view: 'office_memo', threadId: ctx.threadId, row: ctx.row };
  }
  return { view: 'fallback', route: item?.route || '/manager' };
}
