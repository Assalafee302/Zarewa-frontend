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
  return {
    quotationRef: String(item?.quotationRef || ctx.quotationRef || row.id || row.quotation_ref || '').trim(),
    jobId: String(ctx.jobId || row.job_id || '').trim(),
    refundId: String(ctx.refundId || row.refund_id || row.refundId || '').trim(),
    settlementId,
    requestId: String(ctx.requestId || row.request_id || '').trim(),
    cuttingListId: String(ctx.cuttingListId || row.id || '').trim(),
    materialIncidentId: String(ctx.materialIncidentId || row.id || '').trim(),
    editApprovalId: String(ctx.editApprovalId || row.id || '').trim(),
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
  return { view: 'fallback', route: item?.route || '/manager' };
}
