import { describe, it, expect } from 'vitest';
import { normalizeWorkspacePersonNames } from './normalizeWorkspacePersonNames';

describe('normalizeWorkspacePersonNames', () => {
  it('formats customers, quotations, receipts, and refunds', () => {
    const out = normalizeWorkspacePersonNames({
      ok: true,
      customers: [{ customerID: 'C1', name: 'acme ltd', companyName: 'ACME HOLDINGS' }],
      quotations: [{ id: 'Q1', customer: 'john builder' }],
      receipts: [{ id: 'R1', customer: 'john builder', handledBy: 'jane clerk' }],
      refunds: [{ refundID: 'RF1', customer: 'john builder', payeeName: 'john builder' }],
    });
    expect(out.customers[0].name).toBe('Acme Ltd');
    expect(out.customers[0].companyName).toBe('Acme Holdings');
    expect(out.quotations[0].customer).toBe('John Builder');
    expect(out.receipts[0].handledBy).toBe('Jane Clerk');
    expect(out.refunds[0].payeeName).toBe('John Builder');
  });
});
