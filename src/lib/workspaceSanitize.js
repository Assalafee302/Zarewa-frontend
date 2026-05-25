/**
 * Frontend mirrors backend workspace sanitizers (defense in depth for cache/Runa).
 */
import {
  RESTRICTED_WORK_ITEM_PLACEHOLDER,
  isConfidentialLevel,
  redactWorkItemForViewer,
} from './workspaceConfidentialAccess.js';

export { RESTRICTED_WORK_ITEM_PLACEHOLDER };

/** @param {Record<string, unknown>|null|undefined} item */
export function sanitizeWorkItemForCache(item) {
  if (!item || typeof item !== 'object') return item;
  if (item.redacted) return redactWorkItemForViewer(item, false);
  const { body, routeState, data, ...rest } = item;
  const safeData =
    data && typeof data === 'object'
      ? {
          ...data,
          attachments: isConfidentialLevel(item.confidentiality) ? [] : data.attachments,
        }
      : {};
  return {
    ...rest,
    body: '',
    summary: isConfidentialLevel(item.confidentiality) ? '' : String(item.summary || '').slice(0, 300),
    data: safeData,
    routeState: null,
  };
}

/** @param {Record<string, unknown>|null|undefined} ctx */
export function sanitizeRunaPageContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  const safe = { ...ctx };
  delete safe.routeState;
  delete safe.body;
  delete safe.messages;

  if (safe.selectedWorkItem && typeof safe.selectedWorkItem === 'object') {
    const wi = safe.selectedWorkItem;
    const redacted = Boolean(wi.redacted) || isConfidentialLevel(wi.confidentiality);
    safe.selectedWorkItem = {
      id: wi.id,
      referenceNo: wi.referenceNo,
      title: redacted ? RESTRICTED_WORK_ITEM_PLACEHOLDER.title : String(wi.title || '').slice(0, 120),
      documentType: wi.documentType,
      category: wi.category,
      status: wi.status,
      requiresApproval: Boolean(wi.requiresApproval),
      requiresResponse: Boolean(wi.requiresResponse),
      actionLabel: wi.actionLabel,
      linkedThreadId: wi.linkedThreadId,
      redacted,
    };
  }
  return safe;
}
