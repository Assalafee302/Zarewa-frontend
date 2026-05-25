import { describe, expect, it } from 'vitest';
import { normalizeWorkItem } from './workspaceWorkItemModel.js';

describe('normalizeWorkItem', () => {
  it('fills missing title and preview from reference', () => {
    const item = normalizeWorkItem({ id: 'WI-1', documentType: 'payment_request' }, { userId: 'u1' });
    expect(item.title).toContain('Payment Request');
    expect(item.referenceNo).toBe('WI-1');
    expect(item.previewText.length).toBeGreaterThan(0);
    expect(item.category).toBe('finance');
  });

  it('marks overdue from slaState', () => {
    const item = normalizeWorkItem(
      { id: 'WI-2', documentType: 'payment_request', slaState: 'overdue', requiresApproval: true },
      { userId: 'u1' }
    );
    expect(item.isOverdue).toBe(true);
    expect(item.actionLabel).toBe('Approval required');
  });

  it('never returns empty branch label when branchId exists', () => {
    const item = normalizeWorkItem(
      { id: 'WI-3', branchId: 'KD', documentType: 'memo' },
      { branchNames: { KD: 'Kaduna' } }
    );
    expect(item.branchLabel).toBe('Kaduna');
  });
});
