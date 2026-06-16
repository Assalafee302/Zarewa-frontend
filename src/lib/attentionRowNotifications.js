/** Max individual attention rows surfaced in the notification bell. */
export const ATTENTION_ROW_ALERT_LIMIT = 3;

const ATTENTION_KIND_LABELS = {
  clearance: 'Sign-off',
  flagged: 'Flagged quote',
  production: 'Production gate',
  conversions: 'Production QC',
  refunds: 'Refund approval',
  payments: 'Expense approval',
  material: 'Material exception',
  edit_approvals: 'Edit approval',
  governance: 'Governance',
};

/**
 * Deep link path for a scored manager attention row.
 * @param {object} item
 */
export function managementAttentionItemPath(item) {
  const kind = String(item?.kind || '').trim();
  if (kind === 'clearance' || kind === 'flagged' || kind === 'production') {
    const qref = String(item.quotationRef || item.title || '').trim();
    return qref
      ? `/manager?inbox=orders&quoteRef=${encodeURIComponent(qref)}`
      : '/manager?inbox=orders';
  }
  if (kind === 'refunds') {
    const rid = String(item.refundId || item.title || '').trim();
    return rid
      ? `/manager?inbox=cash_out&refundId=${encodeURIComponent(rid)}`
      : '/manager?inbox=cash_out';
  }
  if (kind === 'payments') {
    const reqId = String(item.requestId || item.title || '').trim();
    return reqId
      ? `/manager?inbox=cash_out&requestId=${encodeURIComponent(reqId)}`
      : '/manager?inbox=cash_out';
  }
  if (kind === 'conversions') {
    const jid = String(item.jobId || item.title || '').trim();
    return jid ? `/manager?inbox=qc&jobId=${encodeURIComponent(jid)}` : '/manager?inbox=qc';
  }
  if (kind === 'material') {
    const mid = String(item?.title || item?.row?.id || '').trim();
    return mid
      ? `/manager?inbox=material&materialIncidentId=${encodeURIComponent(mid)}`
      : '/manager?inbox=material';
  }
  if (kind === 'edit_approvals') return '/manager?inbox=edits';
  if (kind === 'governance') {
    if (item.refundId) {
      return `/manager?inbox=cash_out&refundId=${encodeURIComponent(String(item.refundId))}`;
    }
    if (item.jobId) {
      return `/manager?inbox=qc&jobId=${encodeURIComponent(String(item.jobId))}`;
    }
    if (item.quotationRef) {
      return `/manager?inbox=orders&quoteRef=${encodeURIComponent(String(item.quotationRef))}`;
    }
    return '/manager?inbox=governance';
  }
  return '/manager?inbox=attention';
}

/**
 * @param {object} item — row from GET /api/management/attention
 */
export function managementAttentionItemToNotification(item) {
  const kind = String(item?.kind || '').trim();
  const label = ATTENTION_KIND_LABELS[kind] || 'Manager desk';
  const titleRef = String(item?.title || '').trim();
  const subtitle = String(item?.subtitle || '').trim();
  const reasons = Array.isArray(item?.reasons) ? item.reasons.filter(Boolean).join(' · ') : '';
  const severity =
    kind === 'flagged' || kind === 'governance' ? 'critical' : kind === 'clearance' ? 'warning' : 'warning';

  return {
    id: `attention-row:${item.id}`,
    category: 'manager',
    title: titleRef ? `${label}: ${titleRef}` : label,
    detail: subtitle || reasons || 'Tap to open on the manager desk.',
    severity,
    priority: Number(item.priority) || (severity === 'critical' ? 96 : 80),
    path: managementAttentionItemPath(item),
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
export function pushAttentionRowAlerts(items, { managementAttention, snapshot, maxRows = ATTENTION_ROW_ALERT_LIMIT }) {
  const fromApi = Array.isArray(managementAttention?.items) ? managementAttention.items : [];
  const source = fromApi.length > 0 ? fromApi : buildFallbackAttentionRows(snapshot);
  if (source.length === 0) return false;
  for (const row of source.slice(0, maxRows)) {
    items.push(managementAttentionItemToNotification(row));
  }
  return true;
}
