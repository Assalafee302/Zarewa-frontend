import { describe, expect, it } from 'vitest';
import {
  managementAttentionItemPath,
  pushAttentionRowAlerts,
} from './attentionRowNotifications.js';

describe('attentionRowNotifications', () => {
  it('builds deep links for attention rows', () => {
    expect(
      managementAttentionItemPath({
        kind: 'flagged',
        quotationRef: 'Q2',
        title: 'Q2',
      })
    ).toBe('/manager?inbox=orders&quoteRef=Q2');

    expect(
      managementAttentionItemPath({
        kind: 'refunds',
        refundId: 'R-9',
      })
    ).toBe('/manager?inbox=cash_out&refundId=R-9');

    expect(
      managementAttentionItemPath({
        kind: 'conversions',
        jobId: 'JOB-1',
      })
    ).toBe('/manager?inbox=qc&jobId=JOB-1');
  });

  it('surfaces top attention rows as individual notifications', () => {
    const items = [];
    const ok = pushAttentionRowAlerts(items, {
      managementAttention: {
        items: [
          {
            id: 'flagged:Q2',
            kind: 'flagged',
            priority: 92,
            title: 'Q2',
            subtitle: 'Beta Ltd',
            quotationRef: 'Q2',
          },
        ],
      },
    });
    expect(ok).toBe(true);
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('Q2');
    expect(items[0].path).toContain('quoteRef=Q2');
  });

  it('bell detail is the shared sentence; MD/CEO get the exec link, BM the manager link', () => {
    const row = {
      id: 'refund:RF-7',
      kind: 'refunds',
      refundId: 'RF-7',
      title: 'RF-7',
      subtitle: 'Ade · Overpayment',
      atIso: '2026-10-16',
      row: { amount_ngn: 52_000, customer_name: 'Ade', reason_category: 'Overpayment' },
    };
    const md = [];
    pushAttentionRowAlerts(md, { managementAttention: { items: [row] }, roleKey: 'md' });
    expect(md[0].detail).toMatch(/^Refund ₦52,000 to Ade \(Overpayment\) requested 16 Oct is waiting for approval/);
    expect(md[0].path).toBe('/exec?tab=decide&attention=refund%3ARF-7');

    const bm = [];
    pushAttentionRowAlerts(bm, { managementAttention: { items: [row] }, roleKey: 'sales_manager' });
    expect(bm[0].path).toBe('/manager?inbox=cash_out&refundId=RF-7&attention=refund%3ARF-7');
    expect(bm[0].detail).toBe(md[0].detail);
  });
});
