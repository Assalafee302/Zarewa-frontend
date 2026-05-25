import { workItemNeedsActionForUser } from './workspaceInboxBuckets.js';
import { workItemIsPersonalForUser } from './workItemPersonalInbox.js';
import { workItemMatchesCategory } from './workspaceCategoryRegistry.js';
import { normalizeWorkItem } from './workspaceWorkItemModel.js';

/**
 * @typedef {Object} WorkspaceInboxFilters
 * @property {string} [category]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {string} [officeKey]
 * @property {string} [branchId]
 * @property {boolean} [requiresApproval]
 * @property {boolean} [requiresResponse]
 * @property {boolean} [unreadOnly]
 * @property {boolean} [overdueOnly]
 * @property {boolean} [assignedToMe]
 * @property {boolean} [createdByMe]
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 * @property {string} [query]
 */

export const DEFAULT_INBOX_FILTERS = {
  category: 'all',
  status: '',
  priority: '',
  officeKey: '',
  branchId: '',
  dateFrom: '',
  dateTo: '',
  requiresApproval: false,
  requiresResponse: false,
  unreadOnly: false,
  overdueOnly: false,
  assignedToMe: false,
  createdByMe: false,
  query: '',
};

/**
 * @param {Record<string, unknown>} item
 * @param {WorkspaceInboxFilters} filters
 * @param {{ userId?: string, branchNames?: Record<string,string> }} ctx
 */
export function workItemMatchesInboxFilters(item, filters, ctx = {}) {
  const f = { ...DEFAULT_INBOX_FILTERS, ...filters };
  const normalized = normalizeWorkItem(item, ctx);

  if (f.category && f.category !== 'all' && !workItemMatchesCategory(item, f.category)) return false;

  if (f.status) {
    const st = normalized.status.toLowerCase();
    if (!st.includes(String(f.status).toLowerCase())) return false;
  }

  if (f.priority && normalized.priority !== f.priority) return false;

  if (f.officeKey) {
    const ok = String(item.responsibleOfficeKey || item.officeKey || '').trim();
    if (ok !== f.officeKey) return false;
  }

  if (f.branchId && normalized.branchId !== f.branchId) return false;

  if (f.requiresApproval && !normalized.requiresApproval) return false;
  if (f.requiresResponse && !normalized.requiresResponse) return false;
  if (f.unreadOnly && !normalized.unreadForCurrentUser) return false;
  if (f.overdueOnly && !normalized.isOverdue) return false;

  const uid = String(ctx.userId || '').trim();
  if (f.assignedToMe && String(item.responsibleUserId || '').trim() !== uid) return false;
  if (f.createdByMe && String(item.senderUserId || '').trim() !== uid) return false;

  const updated = String(normalized.updatedAtIso || normalized.createdAtIso || '').slice(0, 10);
  if (f.dateFrom && updated && updated < f.dateFrom) return false;
  if (f.dateTo && updated && updated > f.dateTo) return false;

  if (f.query) {
    const q = String(f.query).trim().toLowerCase();
    if (q.length >= 2) {
      const hay = [
        normalized.title,
        normalized.referenceNo,
        normalized.previewText,
        normalized.branchLabel,
        normalized.documentTypeLabel,
        normalized.responsibleOffice,
        normalized.senderName,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
  }

  return true;
}

/**
 * @param {Record<string, unknown>[]} items
 * @param {WorkspaceInboxFilters} filters
 * @param {{ userId?: string, branchNames?: Record<string,string> }} ctx
 */
export function filterWorkItemsForInbox(items, filters, ctx = {}) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => workItemMatchesInboxFilters(item, filters, ctx));
}

/**
 * @param {Record<string, unknown>[]} items
 * @param {string} userId
 */
export function countWorkItemsNeedingAction(items, userId) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => workItemNeedsActionForUser(item, userId)).length;
}

/**
 * Monitoring view: branch/role queue items visible but not personally assigned.
 * @param {Record<string, unknown>} item
 * @param {{ userId?: string, roleKey?: string, permissions?: string[] }} inboxCtx
 */
export function workItemShowsInMonitoringTray(item, inboxCtx) {
  const uid = String(inboxCtx?.userId || '').trim();
  if (workItemIsPersonalForUser(item, uid)) return false;
  if (workItemNeedsActionForUser(item, uid)) return false;
  return Boolean(item?.requiresApproval || item?.requiresResponse);
}

/**
 * @param {'needs_action'|'all'|'file'|'unfiled'|'monitoring'} view
 * @param {Record<string, unknown>[]} allItems
 * @param {{ userId?: string, roleKey?: string, permissions?: string[] }} inboxCtx
 * @param {typeof import('./workspaceInboxBuckets.js')} buckets
 */
export function itemsForWorkspaceView(view, allItems, inboxCtx, buckets) {
  const v = String(view || 'needs_action');
  if (v === 'all') return allItems;
  if (v === 'file') return allItems.filter((item) => buckets.workItemShowsInFileTray(item, inboxCtx));
  if (v === 'unfiled') return allItems.filter((item) => buckets.workItemShowsInUnfiledTray(item, inboxCtx));
  if (v === 'monitoring') return allItems.filter((item) => workItemShowsInMonitoringTray(item, inboxCtx));
  return allItems.filter((item) => workItemNeedsActionForUser(item, inboxCtx.userId));
}
