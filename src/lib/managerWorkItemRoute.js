import { isManagerInboxWorkItemDocType } from './managerInboxWorkItemTypes';
import { userCanApproveEditMutationsClient } from './editApprovalUi';
import { userMaySeeManagementApprovalQueues, userMaySeeRefundApprovalQueue } from './workItemPersonalInbox';

function enc(value) {
  return encodeURIComponent(String(value || '').trim());
}

/**
 * Deep-link path on the branch manager workstation for a unified work item.
 * @param {object | null | undefined} item
 */
export function managerWorkItemPath(item) {
  if (!item) return '/manager?inbox=attention';

  const existing = String(item.routePath || '').trim();
  if (existing.startsWith('/manager?')) return existing;

  const dt = String(item.documentType || '').trim().toLowerCase();
  const sourceId = String(item.sourceId || item.referenceNo || '').trim();
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const quoteFromData = String(data.quotationRef || data.quotation_ref || '').trim();

  if (dt === 'quotation_clearance' || dt === 'flagged_transaction') {
    return sourceId
      ? `/manager?inbox=orders&quoteRef=${enc(sourceId)}`
      : '/manager?inbox=orders';
  }
  if (dt === 'production_gate') {
    const qref = quoteFromData || sourceId;
    return qref ? `/manager?inbox=orders&quoteRef=${enc(qref)}` : '/manager?inbox=orders';
  }
  if (dt === 'conversion_review') {
    return sourceId ? `/manager?inbox=qc&jobId=${enc(sourceId)}` : '/manager?inbox=qc';
  }
  if (dt === 'refund_request') {
    return sourceId ? `/manager?inbox=cash_out&refundId=${enc(sourceId)}` : '/manager?inbox=cash_out';
  }
  if (dt === 'payment_request') {
    return sourceId ? `/manager?inbox=cash_out&requestId=${enc(sourceId)}` : '/manager?inbox=cash_out';
  }
  if (dt === 'material_incident') {
    return sourceId
      ? `/manager?inbox=material&materialIncidentId=${enc(sourceId)}`
      : '/manager?inbox=material';
  }
  if (dt === 'edit_approval') {
    return sourceId ? `/manager?inbox=edits&editApprovalId=${enc(sourceId)}` : '/manager?inbox=edits';
  }

  if (existing === '/manager') return '/manager?inbox=attention';
  if (existing.startsWith('/manager')) return existing;

  return '/manager?inbox=attention';
}

/**
 * Whether this work item should open on `/manager` instead of a slide-over or other module.
 * @param {object | null | undefined} item
 * @param {{ roleKey?: string; permissions?: string[] }} ctx
 */
export function workItemShouldOpenManagerDesk(item, ctx = {}) {
  if (!item) return false;
  const dt = String(item.documentType || '').trim().toLowerCase();
  const { roleKey, permissions = [] } = ctx;
  const has = (p) => permissions.includes('*') || permissions.includes(p);

  if (isManagerInboxWorkItemDocType(dt) && userMaySeeManagementApprovalQueues(roleKey, permissions)) {
    return true;
  }
  if (dt === 'material_incident' && userMaySeeManagementApprovalQueues(roleKey, permissions)) {
    return true;
  }
  if (dt === 'refund_request' && userMaySeeRefundApprovalQueue(permissions)) {
    return true;
  }
  if (dt === 'payment_request' && has('finance.approve')) {
    return true;
  }
  if (dt === 'edit_approval' && userCanApproveEditMutationsClient(roleKey, permissions)) {
    return true;
  }
  return false;
}
