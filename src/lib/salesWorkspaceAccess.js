import { normalizeJobStatus } from './productionJobPick.js';

export const SALES_ROLE_LABELS = {
  admin: 'Administrator',
  finance_manager: 'Finance manager',
  sales_manager: 'Branch manager',
  sales_staff: 'Sales officer',
  procurement_officer: 'Procurement officer',
  operations_officer: 'Operations officer / Store keeper',
  viewer: 'Read only',
};

export function loadSalesWorkspaceRole(roleKey) {
  return roleKey && SALES_ROLE_LABELS[roleKey] ? roleKey : 'sales_staff';
}

export function saveSalesWorkspaceRole() {
  /* session-owned role; no local override */
}

export function isQuotationFullyPaid(q) {
  if (!q) return false;
  const total = Number(q.totalNgn) || 0;
  const paid = Number(q.paidNgn) || 0;
  if (q.paymentStatus === 'Paid') return true;
  if (total > 0 && paid >= total) return true;
  return false;
}

/** Roles that may amend a fully paid quotation (pricing, lines, material, etc.). */
const FULL_EDIT_PAID_QUOTATION_ROLES = new Set([
  'admin',
  'sales_manager',
  'sales_staff',
  'cashier',
  'operations_officer',
  'procurement_officer',
]);

export function canEditQuotation(q, role) {
  if (!q?.id) return true;
  const st = String(q.status || '').trim();
  if (st === 'Expired' || st === 'Void') return false;
  if (!isQuotationFullyPaid(q)) return true;
  return FULL_EDIT_PAID_QUOTATION_ROLES.has(role);
}

export function quotationEditBlockedReason(q, role) {
  if (canEditQuotation(q, role)) return null;
  const st = String(q?.status || '').trim();
  if (st === 'Expired' || st === 'Void') {
    return 'This quotation is archived (expired or void). Use Revive in the quotation window to return it to the active pipeline, or create a new quote.';
  }
  return 'Fully paid quotations can only be fully edited by a branch manager, operations, or procurement. You can still view the record, or correct colour / gauge / material / profile from view mode when signed in with quotation permission.';
}

export function canEditReceipt(record, role) {
  if (!record?.id) return true;
  if (record.source === 'ledger') return role === 'admin' || role === 'finance_manager';
  return (
    role === 'admin' ||
    role === 'finance_manager' ||
    role === 'sales_manager' ||
    role === 'sales_staff' ||
    role === 'cashier'
  );
}

export function receiptEditBlockedReason(record, role) {
  if (canEditReceipt(record, role)) return null;
  if (record?.source === 'ledger') {
    return 'Posted payments cannot be changed here — Finance reverses the entry and you post again if needed.';
  }
  return 'You do not have permission to change this payment. Ask a branch manager or finance if a correction is needed.';
}

export function canEditCuttingList(c, linkedJob = null) {
  if (!c?.id) return true;
  if (linkedJob && normalizeJobStatus(linkedJob.status) === 'Running') return false;
  if (c.productionEditLocked) return false;
  if (c.productionRegistered && String(c.status || '').trim().toLowerCase() === 'finished') return false;
  return true;
}

export function cuttingListEditBlockedReason(c, linkedJob = null) {
  if (linkedJob && normalizeJobStatus(linkedJob.status) === 'Running') {
    return 'Production is Running for this list — editing is blocked. Finish or pause the job on Operations / production, then try again.';
  }
  if (canEditCuttingList(c, linkedJob)) return null;
  return 'Production is finished for this cutting list — editing is blocked to protect the completed record.';
}
