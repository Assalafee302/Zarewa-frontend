import { afterEach, describe, expect, it } from 'vitest';
import {
  attentionForItem,
  attentionForRecord,
  attentionRecordKey,
  attentionRecordKeyForIntel,
  clearAttentionHighlights,
  findAttentionActionControl,
  highlightAttentionFields,
} from './attentionFocus.js';

const NOW = '2026-10-19T09:00:00.000Z';

const pendingRefund = {
  id: 'refund:RF-1',
  kind: 'refunds',
  refundId: 'RF-1',
  amountNgn: 52_000,
  atIso: '2026-10-16',
  row: { amount_ngn: 52_000, customer_name: 'Ade', reason_category: 'Overpayment' },
};
const dualControl = {
  id: 'dual_control:RF-1:same_approver_payer',
  kind: 'governance',
  refundId: 'RF-1',
  row: { kind: 'same_approver_payer', amountNgn: 52_000, approvedBy: 'Abdulrahman', paidBy: 'Abdulrahman' },
};
const otherRefund = { ...pendingRefund, id: 'refund:RF-2', refundId: 'RF-2' };

describe('record keys', () => {
  it('a refund and its dual-control warning are the same record', () => {
    expect(attentionRecordKey(pendingRefund)).toBe('refund:RF-1');
    expect(attentionRecordKey(dualControl)).toBe('refund:RF-1');
    expect(attentionRecordKey({ kind: 'clearance', quotationRef: 'QT-1' })).toBe('quote:QT-1');
    expect(attentionRecordKey({ kind: 'governance', jobId: 'PRO-1', quotationRef: 'QT-1' })).toBe('quote:QT-1');
    expect(attentionRecordKey({ kind: 'conversions', jobId: 'PRO-1' })).toBe('job:PRO-1');
    expect(attentionRecordKey({ kind: 'material', row: { id: 'MI-1' } })).toBe('material:MI-1');
  });

  it('branch manager selections map to the same keys', () => {
    expect(attentionRecordKeyForIntel({ kind: 'refund', refundId: 'RF-1' })).toBe('refund:RF-1');
    expect(attentionRecordKeyForIntel({ kind: 'quotation', quoteId: 'QT-1' })).toBe('quote:QT-1');
    expect(attentionRecordKeyForIntel({ kind: 'payment', requestId: 'PR-1' })).toBe('payment:PR-1');
    expect(attentionRecordKeyForIntel({ kind: 'governance', item: dualControl })).toBe('refund:RF-1');
    expect(attentionRecordKeyForIntel(null)).toBe('');
  });
});

describe('attentionForRecord', () => {
  it('lists every flag on the record, most serious first, and nothing from other records', () => {
    const a = attentionForRecord('refund:RF-1', [pendingRefund, dualControl, otherRefund], { nowIso: NOW });
    expect(a.ruleIds).toEqual(['same_approver_payer', 'refund_pending']);
    expect(a.sentence).toBe('Refund RF-1 ₦52,000 was approved and paid by the same person (Abdulrahman)');
    expect(a.flags[1].sentence).toBe('Refund ₦52,000 to Ade (Overpayment) requested 16 Oct is waiting for approval — 3 days');
  });

  it('returns null when the record has no flags', () => {
    expect(attentionForRecord('refund:RF-9', [pendingRefund], { nowIso: NOW })).toBeNull();
    expect(attentionForRecord('refund:', [pendingRefund], { nowIso: NOW })).toBeNull();
  });

  it('prefers the server explanation on the item', () => {
    const server = { ...pendingRefund, attention: { ...attentionForItem(pendingRefund, { nowIso: NOW }), flags: [] } };
    expect(attentionForItem(server).flags).toEqual([]);
  });
});

describe('DOM focus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('highlights the offending field and finds the decision control by alias', () => {
    document.body.innerHTML = `
      <div id="root">
        <div data-attention-field="amount">₦52,000</div>
        <div data-attention-field="paid">paid</div>
        <button data-attention-action="clear">Clear</button>
        <button data-attention-action="reject">Reject</button>
      </div>`;
    const root = document.getElementById('root');
    const hits = highlightAttentionFields(root, ['amount', 'amount']);
    expect(hits).toHaveLength(1);
    expect(hits[0].getAttribute('data-attention-highlight')).toBe('true');
    expect(hits[0].className).toContain('ring-rose-400');
    expect(root.querySelector('[data-attention-field="paid"]').className).toBe('');
    clearAttentionHighlights(hits);
    expect(hits[0].hasAttribute('data-attention-highlight')).toBe(false);

    expect(findAttentionActionControl(root, 'approve')?.textContent).toBe('Clear');
    expect(findAttentionActionControl(root, 'reject')?.textContent).toBe('Reject');
    expect(findAttentionActionControl(root, 'sign_off')).toBeNull();
  });
});
