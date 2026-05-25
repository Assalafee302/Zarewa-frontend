import { isConfidentialLevel } from './workspaceConfidentialAccess.js';
import { categoryForWorkItem, categoryMetaForWorkItem } from './workspaceCategoryRegistry.js';
import { workItemNeedsActionForUser } from './workspaceInboxBuckets.js';
import { workItemIsPersonalForUser } from './workItemPersonalInbox.js';

const OFFICE_LABELS = {
  office_admin: 'Office administration',
  branch_manager: 'Branch manager',
  sales: 'Sales office',
  procurement: 'Procurement office',
  operations: 'Operations office',
  finance: 'Finance office',
  hr: 'HR office',
  general: 'General office',
};

/**
 * @param {string} documentType
 */
export function humanizeDocumentType(documentType) {
  const dt = String(documentType || 'work_item').trim();
  if (!dt) return 'Work item';
  return dt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string} status
 */
export function statusToneClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('reject') || s.includes('flag')) return 'text-rose-700 bg-rose-50 ring-rose-100';
  if (s.includes('approve') || s.includes('closed') || s.includes('complete')) {
    return 'text-emerald-700 bg-emerald-50 ring-emerald-100';
  }
  if (s.includes('pending') || s.includes('review') || s.includes('open')) {
    return 'text-amber-800 bg-amber-50 ring-amber-100';
  }
  return 'text-slate-600 bg-slate-50 ring-slate-100';
}

/**
 * @param {string} iso
 */
export function formatWorkItemDate(iso) {
  const s = String(iso || '').trim();
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Normalize a raw work item with safe fallbacks for inbox rendering.
 * @param {Record<string, unknown>|null|undefined} raw
 * @param {{ userId?: string, branchNames?: Record<string,string> }} [ctx]
 */
export function normalizeWorkItem(raw, ctx = {}) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const category = categoryForWorkItem(item);
  const categoryMeta = categoryMetaForWorkItem(item);
  const documentType = String(item.documentType || 'work_item').trim().toLowerCase() || 'work_item';
  const referenceNo = String(item.referenceNo || item.id || '—').trim() || '—';
  const branchId = String(item.branchId || '').trim();
  const branchLabel = ctx.branchNames?.[branchId] || branchId || 'Branch';
  const officeKey = String(item.responsibleOfficeKey || item.officeKey || 'general').trim();
  const responsibleOffice =
    String(item.officeLabel || OFFICE_LABELS[officeKey] || officeKey || 'Office').trim() || 'Office';
  const senderName =
    String(item.senderDisplayName || item.senderName || '').trim() ||
    (item.senderUserId ? 'Staff member' : 'System');
  const summary = String(item.summary || '').replace(/\s+/g, ' ').trim();
  const bodyPreview = String(item.body || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const confidential = isConfidentialLevel(item.confidentiality);
  const previewText = confidential
    ? 'Restricted — permission required'
    : String(item.previewText || summary || bodyPreview || humanizeDocumentType(documentType)).trim();
  const title = confidential
    ? String(item.title || 'Restricted memo').trim() || 'Restricted memo'
    : String(item.title || '').trim() || `${humanizeDocumentType(documentType)} · ${referenceNo}`;
  const status = String(item.status || 'open').trim() || 'open';
  const priority = String(item.priority || 'normal').trim() || 'normal';
  const userId = String(ctx.userId || '').trim();
  const needsAction = userId ? workItemNeedsActionForUser(item, userId) : false;
  const assignedToMe = userId && String(item.responsibleUserId || '').trim() === userId;
  const createdByMe = userId && String(item.senderUserId || '').trim() === userId;
  const isOverdue = item.slaState === 'overdue' || Boolean(item.overdue);
  const filingStatus = item.filingIncomplete
    ? 'unfiled'
    : item.archivedAtIso || ['closed', 'completed', 'cancelled', 'converted'].includes(status.toLowerCase())
      ? 'filed'
      : 'open';

  let actionLabel = '';
  if (needsAction) {
    if (item.requiresApproval) actionLabel = 'Approval required';
    else if (item.requiresResponse) actionLabel = 'Response required';
    else actionLabel = 'Action required';
  }

  return {
    ...item,
    id: String(item.id || referenceNo).trim() || referenceNo,
    referenceNo,
    branchId,
    branchLabel,
    documentType,
    documentClass: String(item.documentClass || '').trim(),
    category,
    categoryLabel: categoryMeta.label,
    categoryColorClass: categoryMeta.colorClass,
    status,
    statusLabel: status.replace(/_/g, ' '),
    statusToneClass: statusToneClass(status),
    priority,
    priorityToneClass:
      priority === 'high' || priority === 'urgent'
        ? 'text-rose-700 bg-rose-50 ring-rose-100'
        : priority === 'low'
          ? 'text-slate-500 bg-slate-50 ring-slate-100'
          : 'text-slate-600 bg-slate-50 ring-slate-100',
    title,
    summary,
    previewText,
    senderName,
    responsibleOffice,
    requiresApproval: Boolean(item.requiresApproval),
    requiresResponse: Boolean(item.requiresResponse),
    requiresReview: Boolean(item.requiresReview),
    dueAtIso: String(item.dueAtIso || '').trim(),
    updatedAtIso: String(item.updatedAtIso || item.createdAtIso || '').trim(),
    createdAtIso: String(item.createdAtIso || '').trim(),
    formattedDate: formatWorkItemDate(item.updatedAtIso || item.createdAtIso),
    linkedThreadId: String(item.linkedThreadId || '').trim(),
    needsAction,
    assignedToMe,
    createdByMe,
    isOverdue,
    filingStatus,
    actionLabel,
    documentTypeLabel: humanizeDocumentType(documentType),
    unreadForCurrentUser: Boolean(item.unreadForCurrentUser),
    riskFlags: Array.isArray(item.riskFlags) ? item.riskFlags : isOverdue ? ['overdue'] : [],
  };
}

/**
 * @param {Record<string, unknown>[]} items
 * @param {{ userId?: string, branchNames?: Record<string,string> }} [ctx]
 */
export function normalizeWorkItems(items, ctx = {}) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeWorkItem(item, ctx));
}

/**
 * @param {ReturnType<typeof normalizeWorkItem>} item
 * @param {string} userId
 */
export function workItemAssignedOrCreatedByUser(item, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return false;
  return workItemIsPersonalForUser(item, uid);
}
