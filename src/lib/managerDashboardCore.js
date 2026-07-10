/** Primary branch manager dashboard inbox: one “everything” queue plus category tabs. */
export const MANAGER_INBOX_TABS = [
  {
    key: 'attention',
    label: 'Everything',
    description: 'All priority items — orders, cash, QC, flags, material, and governance',
  },
  {
    key: 'orders',
    label: 'Order review',
    description: 'Paid quotations awaiting branch manager sign-off, flags, and production gate exceptions',
  },
  {
    key: 'cash_out',
    label: 'Cash out',
    description: 'Customer refunds and expense payment requests awaiting approval',
  },
  {
    key: 'qc',
    label: 'Production QC',
    description: 'Completed jobs with conversion alerts — separate from order sign-off',
  },
  {
    key: 'material',
    label: 'Material exceptions',
    description: 'Offcut / return incidents awaiting branch manager approval',
  },
  {
    key: 'procurement',
    label: 'PO lifecycle',
    description: 'Purchase orders awaiting approval — review commitment before procurement proceeds',
  },
  {
    key: 'credit',
    label: 'Delivery credit',
    description: 'Approve delivery on credit while receivable stays outstanding (MD above branch limits)',
  },
  {
    key: 'governance',
    label: 'Risk & governance',
    description: 'Dual-control segregation warnings and payment-gate breaches on completed jobs',
  },
  {
    key: 'edits',
    label: 'Edit approvals',
    description: 'Second-party approval required before sensitive records are saved',
  },
];

/** Filter chips on the Everything tab for quick sorting. */
export const MANAGER_ATTENTION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'orders', label: 'Orders', kinds: ['clearance', 'production', 'flagged'] },
  { key: 'cash', label: 'Cash', kinds: ['refunds', 'payments'] },
  { key: 'qc', label: 'QC', kinds: ['conversions'] },
  { key: 'material', label: 'Material', kinds: ['material'] },
  { key: 'flagged', label: 'Flagged', kinds: ['flagged'] },
  { key: 'governance', label: 'Governance', kinds: ['governance'] },
  { key: 'staff_credit', label: 'Staff credit', kinds: ['staff_purchase_credit'] },
  { key: 'edits', label: 'Edits', kinds: ['edit_approvals'] },
];

const ATTENTION_FILTER_KINDS = Object.fromEntries(
  MANAGER_ATTENTION_FILTERS.filter((f) => f.kinds).map((f) => [f.key, f.kinds])
);

/**
 * Map legacy ?inbox= values and old tab keys to the simplified layout.
 * @returns {{ tab: string; attentionFilter: string }}
 */
export function normalizeManagerInboxRoute(rawInbox) {
  const k = String(rawInbox || '').trim().toLowerCase();
  if (!k || k === 'attention') return { tab: 'attention', attentionFilter: 'all' };
  if (k === 'flagged') return { tab: 'attention', attentionFilter: 'flagged' };
  if (k === 'clearance' || k === 'production') return { tab: 'orders', attentionFilter: 'orders' };
  if (k === 'refunds' || k === 'payments') return { tab: 'cash_out', attentionFilter: 'cash' };
  if (k === 'conversions') return { tab: 'qc', attentionFilter: 'qc' };
  if (k === 'edit_approvals' || k === 'edits') return { tab: 'edits', attentionFilter: 'all' };
  if (k === 'governance') return { tab: 'governance', attentionFilter: 'all' };
  if (k === 'material') return { tab: 'material', attentionFilter: 'material' };
  if (k === 'procurement' || k === 'purchase_orders' || k === 'po') return { tab: 'procurement', attentionFilter: 'all' };
  // Attendance moved to Team HR — callers should redirect; keep a safe fallback.
  if (k === 'attendance' || k === 'staff') return { tab: 'attention', attentionFilter: 'all', redirectToTeamHr: true };
  if (k === 'stock' || k === 'stock_register') return { tab: 'stock', attentionFilter: 'all' };
  if (k === 'credit') return { tab: 'credit', attentionFilter: 'all' };
  if (MANAGER_INBOX_TABS.some((t) => t.key === k)) return { tab: k, attentionFilter: 'all' };
  return { tab: 'attention', attentionFilter: 'all' };
}

/** Four-color status system: emerald / amber / rose / slate. Kind uses icon + label, not hue. */
export const MANAGER_STATUS_TONES = {
  success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  urgent: 'bg-rose-100 text-rose-900 border-rose-200',
  info: 'bg-slate-100 text-slate-700 border-slate-200',
};

/**
 * @param {string} kind
 * @param {{ breached?: boolean; flagged?: boolean }} [opts]
 */
export function managerKindTone(kind, opts = {}) {
  if (opts.breached || opts.flagged || kind === 'governance' || kind === 'flagged') return 'urgent';
  if (kind === 'clearance' || kind === 'refunds' || kind === 'payments' || kind === 'edit_approvals' || kind === 'edit_approval') {
    return 'pending';
  }
  return 'pending';
}

/**
 * Best-effort age hours from common timestamp fields.
 * @param {object} row
 * @returns {number | null}
 */
export function managerRowAgeHours(row) {
  const raw =
    row?.created_at ||
    row?.createdAt ||
    row?.requested_at ||
    row?.requestedAt ||
    row?.submitted_at ||
    row?.submittedAt ||
    row?.opened_at ||
    row?.openedAt ||
    row?.updated_at ||
    row?.updatedAt ||
    null;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (Date.now() - t) / 36e5);
}

/** Refund SLA is 48h; other queues use 24h amber / 48h red. */
export function managerSlaMeta(kind, ageHours) {
  if (ageHours == null || !Number.isFinite(ageHours)) return null;
  const isRefund = String(kind || '').includes('refund');
  const breachAt = isRefund ? 48 : 48;
  const warnAt = isRefund ? 24 : 24;
  const hours = Math.round(ageHours);
  if (ageHours >= breachAt) return { label: `${hours}h — SLA breached`, tone: 'urgent' };
  if (ageHours >= warnAt) return { label: `${hours}h`, tone: 'pending' };
  return { label: `${hours}h`, tone: 'info' };
}

export function attentionKindMatchesFilter(kind, filterKey) {
  const fk = String(filterKey || 'all').trim().toLowerCase();
  if (fk === 'all') return true;
  const kinds = ATTENTION_FILTER_KINDS[fk];
  if (!kinds) return true;
  return kinds.includes(String(kind || '').trim().toLowerCase());
}

export function filterAttentionItems(items, filterKey) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((it) => attentionKindMatchesFilter(it?.kind, filterKey));
}

/**
 * @param {{ pendingClearance?: object[]; productionOverrides?: object[]; flagged?: object[] }} displayItems
 */
export function buildOrdersInboxRows(displayItems) {
  const flagged = (displayItems?.flagged || []).map((row) => ({
    ...row,
    _inboxKind: 'flagged',
    _rowKey: `flagged:${row.id}`,
  }));
  const clearance = (displayItems?.pendingClearance || []).map((row) => ({
    ...row,
    _inboxKind: 'clearance',
    _rowKey: `clearance:${row.id}`,
  }));
  const production = (displayItems?.productionOverrides || []).map((row) => ({
    ...row,
    _inboxKind: 'production',
    _rowKey: `production:${row.id}`,
  }));
  return [...flagged, ...clearance, ...production];
}

/**
 * @param {{ pendingRefunds?: object[]; pendingExpenses?: object[] }} displayItems
 */
/** @param {object[]} attentionItems */
export function buildGovernanceInboxRows(attentionItems) {
  return (Array.isArray(attentionItems) ? attentionItems : [])
    .filter((it) => String(it?.kind || '').toLowerCase() === 'governance')
    .map((row) => ({ ...row, _rowKey: `governance:${row.id}` }));
}

/** @param {object[]} editApprovalPending */
export function buildEditApprovalInboxRows(editApprovalPending) {
  return (Array.isArray(editApprovalPending) ? editApprovalPending : []).map((row) => ({
    ...row,
    _inboxKind: 'edit_approval',
    _rowKey: `edit:${row.id}`,
  }));
}

/** @param {object[]} poRows */
export function buildProcurementInboxRows(poRows) {
  return (Array.isArray(poRows) ? poRows : []).map((row) => ({
    ...row,
    _inboxKind: 'purchase_order',
    _rowKey: `po:${row.po_id}`,
  }));
}

export function buildCashOutInboxRows(displayItems) {
  const refunds = (displayItems?.pendingRefunds || []).map((row) => ({
    ...row,
    _inboxKind: 'refund',
    _rowKey: `refund:${row.refund_id}`,
  }));
  const payments = (displayItems?.pendingExpenses || []).map((row) => ({
    ...row,
    _inboxKind: 'payment',
    _rowKey: `payment:${row.request_id}`,
  }));
  return [...refunds, ...payments];
}

export function formatRefundReasonCategory(raw) {
  if (raw == null || raw === '') return '—';
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) return arr.filter(Boolean).join(', ') || '—';
  } catch {
    /* stored as plain text */
  }
  return String(raw).trim() || '—';
}

export function flattenQuotationLineItems(quotation) {
  const ql = quotation?.quotationLines;
  if (!ql || typeof ql !== 'object') return [];
  const out = [];
  for (const cat of ['products', 'accessories', 'services']) {
    const arr = ql[cat];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const name = item.name || item.label || item.description || 'Line';
      const qty = item.qty ?? item.quantity ?? item.qtyMeters ?? '';
      const unit = item.unit || item.uom || '';
      const unitPrice = item.unitPrice ?? item.unit_price_ngn ?? item.price ?? '';
      const lineTotal = item.lineTotal ?? item.line_total_ngn ?? item.total ?? '';
      const id = item.id != null && String(item.id).trim() ? String(item.id).trim() : '';
      const gauge = item.gauge ?? item.gaugeLabel ?? item.gauge_label ?? '';
      const colour = item.colour ?? item.color ?? '';
      const design = item.design ?? '';
      const profile = item.profile ?? '';
      const materialType =
        item.materialType ?? item.materialTypeName ?? item.material_type_name ?? item.material ?? '';
      out.push({
        category: cat,
        name,
        qty,
        unit,
        unitPrice,
        lineTotal,
        id,
        gauge,
        colour,
        color: colour,
        design,
        profile,
        materialType,
      });
    }
  }
  return out;
}

export function ledgerTypeStyle(type, theme = 'dark') {
  const t = String(type || '').toUpperCase();
  const light = theme === 'light';
  if (t === 'RECEIPT' || t === 'ADVANCE_IN' || t === 'OVERPAY_ADVANCE') {
    return light ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-500/20 text-emerald-200';
  }
  if (t.includes('REVERSAL') || t.includes('REFUND') || t.includes('OUT')) {
    return light ? 'bg-rose-100 text-rose-900' : 'bg-rose-500/20 text-rose-200';
  }
  if (t.includes('APPLIED')) {
    return light ? 'bg-sky-100 text-sky-900' : 'bg-sky-500/20 text-sky-200';
  }
  return light ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-white/70';
}

export function matchesInboxSearch(query, row, tabKey) {
  const s = String(query || '').trim().toLowerCase();
  if (!s) return true;
  const parts = [];
  if (tabKey === 'attention') {
    parts.push(row.title, row.subtitle, row.kind, row.quotationRef, row.poId, row.refundId, row.requestId);
    if (Array.isArray(row.reasons)) parts.push(...row.reasons);
  } else if (tabKey === 'orders') {
    if (row._inboxKind === 'production') {
      parts.push(row.id, row.quotation_ref, row.customer_name);
    } else if (row._inboxKind === 'flagged') {
      parts.push(row.id, row.customer_name, row.manager_flag_reason);
    } else {
      parts.push(row.id, row.customer_name, row.status);
    }
  } else if (tabKey === 'material') {
    parts.push(row.id, row.incident_type, row.gauge_label, row.colour, row.storekeeper_remark);
  } else if (tabKey === 'cash_out') {
    if (row._inboxKind === 'payment') {
      parts.push(
        row.request_id,
        row.description,
        row.expense_id,
        row.request_reference,
        row.attachment_name,
        row.expense_category
      );
    } else {
      parts.push(row.refund_id, row.customer_name, row.quotation_ref, formatRefundReasonCategory(row.reason_category));
    }
  } else if (tabKey === 'clearance' || tabKey === 'flagged') {
    parts.push(row.id, row.customer_name, row.status);
  } else if (tabKey === 'production') {
    parts.push(row.id, row.quotation_ref, row.customer_name);
  } else if (tabKey === 'refunds') {
    parts.push(row.refund_id, row.customer_name, row.quotation_ref, formatRefundReasonCategory(row.reason_category));
  } else if (tabKey === 'payments') {
    parts.push(
      row.request_id,
      row.description,
      row.expense_id,
      row.request_reference,
      row.attachment_name,
      row.expense_category
    );
  } else if (tabKey === 'qc' || tabKey === 'conversions') {
    parts.push(
      row.job_id,
      row.quotation_ref,
      row.cutting_list_id,
      row.customer_name,
      row.product_name,
      row.conversion_alert_state
    );
  } else if (tabKey === 'edit_approvals' || tabKey === 'edits') {
    parts.push(row.id, row.entityKind, row.entityId, row.requestedByDisplay, row.requestedByUserId, row.status);
  } else if (tabKey === 'procurement') {
    parts.push(row.po_id, row.supplier_name, row.status);
  } else if (tabKey === 'governance') {
    parts.push(row.id, row.title, row.subtitle, row.quotationRef, row.refundId, row.jobId);
    if (Array.isArray(row.reasons)) parts.push(...row.reasons);
  }
  return parts.some((p) => String(p ?? '').toLowerCase().includes(s));
}

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

