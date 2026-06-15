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
    key: 'credit',
    label: 'Delivery credit',
    description: 'Approve delivery on credit while receivable stays outstanding (MD above branch limits)',
  },
  {
    key: 'attendance',
    label: 'Staff attendance',
    description: 'Mark daily present, late, or absent for your branch staff',
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
  if (k === 'edit_approvals') return { tab: 'attention', attentionFilter: 'edits' };
  if (k === 'material') return { tab: 'material', attentionFilter: 'material' };
  if (k === 'attendance') return { tab: 'attendance', attentionFilter: 'all' };
  if (MANAGER_INBOX_TABS.some((t) => t.key === k)) return { tab: k, attentionFilter: 'all' };
  return { tab: 'attention', attentionFilter: 'all' };
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
  } else if (tabKey === 'edit_approvals') {
    parts.push(row.id, row.entityKind, row.entityId, row.requestedByDisplay, row.requestedByUserId, row.status);
  }
  return parts.some((p) => String(p ?? '').toLowerCase().includes(s));
}

export function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

