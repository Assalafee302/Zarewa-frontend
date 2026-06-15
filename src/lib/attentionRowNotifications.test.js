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
});
