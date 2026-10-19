import { attentionDeepLink } from '../shared/lib/attentionRules.js';
import { attentionForItem } from './attentionFocus.js';
import { roleUsesExecutiveApprovalDesk } from './approvalDeskPaths.js';

/** Max individual attention rows surfaced in the notification bell. */
export const ATTENTION_ROW_ALERT_LIMIT = 3;

const ATTENTION_KIND_LABELS = {
  clearance: 'Sign-off',
  flagged: 'Flagged quote',
  production: 'Production gate',
  price_exception: 'Below-floor price',
  conversions: 'Production QC',
  refunds: 'Refund approval',
  register_settlement: 'Payable withdrawal',
  payments: 'Expense approval',
  material: 'Material exceptions',
  edit_approvals: 'Edit approval',
  governance: 'Governance',
};

/**
 * Deep link path for a scored manager attention row (shared rule — same link the row and banner use).
 * @param {object} item
 * @param {'manager' | 'exec'} [surface]
 */
export function managementAttentionItemPath(item, surface = 'manager') {
  return attentionDeepLink(item, surface);
}

/**
 * @param {object} item — row from GET /api/management/attention
 * @param {{ roleKey?: string }} [opts]
 */
export function managementAttentionItemToNotification(item, opts = {}) {
  const kind = String(item?.kind || '').trim();
  const label = ATTENTION_KIND_LABELS[kind] || 'Manager desk';
  const titleRef = String(item?.title || '').trim();
  const attention = attentionForItem(item);
  const severity =
    attention?.severity === 'critical' || kind === 'flagged' || kind === 'governance' ? 'critical' : 'warning';
  const surface = roleUsesExecutiveApprovalDesk(opts.roleKey) ? 'exec' : 'manager';

  return {
    id: `attention-row:${item.id}`,
    category: 'manager',
    title: titleRef ? `${label}: ${titleRef}` : label,
    detail: attention?.sentence || String(item?.subtitle || '').trim() || 'Open on the manager desk.',
    severity,
    priority: Number(item.priority) || (severity === 'critical' ? 96 : 80),
    path: managementAttentionItemPath(item, surface),
    state: {},
  };
}

/**
 * Offline / pre-fetch fallback: pseudo attention rows from snapshot queues.
 * @param {object | null | undefined} snapshot
 * @returns {object[]}
 */
export function buildFallbackAttentionRows(snapshot) {
  const quotations = Array.isArray(snapshot?.quotations) ? snapshot.quotations : [];
  const refunds = Array.isArray(snapshot?.refunds) ? snapshot.refunds : [];
  const rows = [];

  const flagged = quotations.find((q) => q.managerFlaggedAtISO);
  if (flagged) {
    rows.push({
      id: `flagged:${flagged.id}`,
      kind: 'flagged',
      priority: 92,
      title: flagged.id,
      subtitle: flagged.managerFlagReason || flagged.customer || 'Flagged',
      quotationRef: flagged.id,
    });
  }

  const clearance = quotations.find(
    (q) => (Number(q.paidNgn) || 0) > 0 && !q.managerClearedAtISO && !q.managerFlaggedAtISO
  );
  if (clearance) {
    rows.push({
      id: `clearance:${clearance.id}`,
      kind: 'clearance',
      priority: 70,
      title: clearance.id,
      subtitle: clearance.customer || 'Paid quotation',
      quotationRef: clearance.id,
    });
  }

  const refund = refunds.find((r) => String(r.status) === 'Pending');
  if (refund) {
    rows.push({
      id: `refund:${refund.refundID || refund.refund_id}`,
      kind: 'refunds',
      priority: 74,
      title: refund.refundID || refund.refund_id,
      subtitle: refund.customer || 'Pending refund',
      refundId: refund.refundID || refund.refund_id,
      quotationRef: refund.quotationRef || '',
    });
  }

  return rows.slice(0, ATTENTION_ROW_ALERT_LIMIT);
}

/**
 * @param {object[]} items — notification list to mutate
 * @param {{ managementAttention?: object | null; snapshot?: object | null; maxRows?: number }} params
 * @returns {boolean} true when row-level alerts were added
 */
export function pushAttentionRowAlerts(
  items,
  { managementAttention, snapshot, roleKey, maxRows = ATTENTION_ROW_ALERT_LIMIT }
) {
  const fromApi = Array.isArray(managementAttention?.items) ? managementAttention.items : [];
  const source = fromApi.length > 0 ? fromApi : buildFallbackAttentionRows(snapshot);
  if (source.length === 0) return false;
  for (const row of source.slice(0, maxRows)) {
    items.push(managementAttentionItemToNotification(row, { roleKey }));
  }
  return true;
}
