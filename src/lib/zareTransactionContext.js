/**
 * Build safe transaction context for Zare from ERP UI state.
 */

/**
 * @param {object} params
 */
export function buildZareTransactionContext({
  module = '',
  currentPage = '',
  pathname = '',
  transactionType = '',
  referenceNo = '',
  status = '',
  branchId = '',
  branchName = '',
  readOnly = false,
  canEdit = false,
  canReverse = false,
  canApprove = false,
  approvalStatus = '',
  settlementStatus = '',
  showFinancialSummary = false,
  amountSummary = '',
} = {}) {
  return {
    module,
    currentPage,
    pathname,
    transactionType,
    referenceNo: referenceNo ? String(referenceNo).slice(0, 40) : undefined,
    status,
    branchId,
    branchName: branchName ? String(branchName).slice(0, 80) : undefined,
    approvalStatus,
    settlementStatus,
    canView: true,
    canEdit: !readOnly && Boolean(canEdit),
    canReverse: Boolean(canReverse),
    canApprove: Boolean(canApprove),
    canRequestCorrection: true,
    canCreateMemo: true,
    canAttachDocument: !readOnly,
    showFinancialSummary: Boolean(showFinancialSummary),
    amountSummary: showFinancialSummary && amountSummary ? String(amountSummary).slice(0, 80) : undefined,
  };
}
