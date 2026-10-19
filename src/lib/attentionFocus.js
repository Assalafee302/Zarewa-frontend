/**
 * Opening a flagged record on its problem: highlight the offending field and jump to the decision control.
 * Fields/controls opt in with `data-attention-field="<focus>"` and `data-attention-action="<action id>"`;
 * the focus and action ids come from the shared rules (src/shared/lib/attentionRules.js).
 */
import { explainAttentionItem } from '../shared/lib/attentionRules.js';

export const ATTENTION_HIGHLIGHT_CLASSES = ['ring-2', 'ring-rose-400', 'ring-offset-2', 'rounded-md', 'bg-rose-50/60'];

/** Same control can carry another name (payroll sign-off is the approve tile, clearance "Clear" = approve). */
const ACTION_ALIASES = {
  approve: ['approve', 'clear', 'sign_off'],
  clear: ['clear', 'approve'],
  sign_off: ['sign_off', 'approve'],
  override: ['override'],
  reject: ['reject'],
  flag: ['flag'],
  acknowledge: ['acknowledge'],
};

/**
 * The item's explanation: the server's (`item.attention`) when present, else built here from the same rules.
 * @param {object | null | undefined} item
 * @param {{ limits?: object, nowIso?: string }} [ctx]
 */
export function attentionForItem(item, ctx = {}) {
  if (!item) return null;
  if (item.attention && Array.isArray(item.attention.flags)) return item.attention;
  return explainAttentionItem(item, ctx);
}

/**
 * Highlight every `[data-attention-field]` named by the flags; scroll the first into view.
 * @param {ParentNode | null | undefined} root
 * @param {string[]} focusIds
 * @returns {Element[]} highlighted elements (for cleanup)
 */
export function highlightAttentionFields(root, focusIds) {
  if (!root || !Array.isArray(focusIds) || focusIds.length === 0) return [];
  const hit = [];
  for (const id of [...new Set(focusIds)]) {
    for (const el of root.querySelectorAll(`[data-attention-field="${id}"]`)) {
      el.classList.add(...ATTENTION_HIGHLIGHT_CLASSES);
      el.setAttribute('data-attention-highlight', 'true');
      hit.push(el);
    }
  }
  // Only scrolls when the field is off-screen, so the banner above it stays in view.
  hit[0]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  return hit;
}

/** @param {Element[]} els */
export function clearAttentionHighlights(els) {
  for (const el of els || []) {
    el.classList.remove(...ATTENTION_HIGHLIGHT_CLASSES);
    el.removeAttribute('data-attention-highlight');
  }
}

/**
 * Find the record's own control for a clearing action (Approve / Reject / Clear / Sign off …).
 * @param {ParentNode | null | undefined} root
 * @param {string} actionId
 * @returns {HTMLElement | null}
 */
export function findAttentionActionControl(root, actionId) {
  if (!root) return null;
  for (const name of ACTION_ALIASES[actionId] || [actionId]) {
    const el = root.querySelector(`[data-attention-action="${name}"]`);
    if (el) return /** @type {HTMLElement} */ (el);
  }
  return null;
}

/**
 * Banner button → the record's decision control: scroll to it, focus it, flash it. The control keeps its own
 * confirmation (amount, note, acknowledgement), so the banner never approves money on one tap.
 * @returns {boolean} true when a control was found
 */
export function jumpToAttentionAction(root, actionId) {
  const el = findAttentionActionControl(root, actionId);
  if (!el) return false;
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  el.focus?.({ preventScroll: true });
  el.classList.add('ring-4', 'ring-zarewa-teal/40');
  window.setTimeout(() => el.classList.remove('ring-4', 'ring-zarewa-teal/40'), 1600);
  return true;
}

const s = (v) => String(v ?? '').trim();

/**
 * The record an attention item is about ("refund:RF-1", "quote:QT-1", …) so every flag on one record can be
 * listed together in its banner.
 * @param {object} item
 */
export function attentionRecordKey(item) {
  const it = item || {};
  const row = it.row || it.reviewContext?.row || {};
  const kind = s(it.kind).toLowerCase();
  if (kind === 'refunds' || (kind === 'governance' && s(it.refundId || row.refundId))) {
    return `refund:${s(it.refundId || row.refund_id || row.refundId || it.title)}`;
  }
  if (['clearance', 'flagged', 'production', 'price_exception'].includes(kind) || (kind === 'governance' && s(it.quotationRef))) {
    return `quote:${s(it.quotationRef || row.quotation_ref || row.id || it.title)}`;
  }
  if (kind === 'conversions') return `job:${s(it.jobId || row.job_id || it.title)}`;
  if (kind === 'payments') return `payment:${s(it.requestId || row.request_id || it.title)}`;
  if (kind === 'register_settlement') return `settlement:${s(it.settlementId || row.settlementId || it.title)}`;
  if (kind === 'staff_purchase_credit') return `staff_credit:${s(it.accountId || row.id)}`;
  if (kind === 'material') return `material:${s(row.id || it.title)}`;
  return `item:${s(it.id)}`;
}

/**
 * The record key of a branch-manager detail selection (useBranchManagerWorkstation `selectedIntel`).
 * @param {object | null | undefined} intel
 */
export function attentionRecordKeyForIntel(intel) {
  const k = s(intel?.kind);
  if (k === 'refund') return `refund:${s(intel.refundId)}`;
  if (k === 'quotation') return `quote:${s(intel.quoteId)}`;
  if (k === 'conversion') return `job:${s(intel.jobId)}`;
  if (k === 'payment') return `payment:${s(intel.requestId)}`;
  if (k === 'register_settlement') return `settlement:${s(intel.settlementId)}`;
  if (k === 'staff_purchase_credit') return `staff_credit:${s(intel.accountId)}`;
  if (k === 'material') return `material:${s(intel.materialIncidentId)}`;
  if (k === 'governance' && intel.item) return attentionRecordKey(intel.item);
  return '';
}

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };

/**
 * One banner for a record: every flag from every attention item about that record (duplicates removed),
 * most serious first. Returns null when nothing about this record is flagged.
 * @param {string} recordKey
 * @param {object[]} items attention items (server rows; may carry `.attention`)
 * @param {{ limits?: object, nowIso?: string }} [ctx]
 */
export function attentionForRecord(recordKey, items, ctx = {}) {
  if (!recordKey || recordKey.endsWith(':')) return null;
  const mine = (items || []).filter((it) => attentionRecordKey(it) === recordKey);
  if (mine.length === 0) return null;
  const explained = mine.map((it) => attentionForItem(it, ctx)).filter(Boolean);
  const seen = new Set();
  const flags = [];
  for (const a of explained) {
    for (const f of a.flags || []) {
      if (seen.has(f.ruleId)) continue;
      seen.add(f.ruleId);
      flags.push(f);
    }
  }
  flags.sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0));
  const first = explained.find((a) => a.ruleId === flags[0]?.ruleId) || explained[0];
  return { ...first, flags, ruleId: flags[0]?.ruleId || '', ruleIds: flags.map((f) => f.ruleId), sentence: flags[0]?.sentence || '', severity: flags[0]?.severity || 'info' };
}
