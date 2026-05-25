import { describe, expect, it } from 'vitest';
import { computeWorkspaceIntelligence } from './workspaceIntelligence.js';

describe('computeWorkspaceIntelligence', () => {
  it('counts action required items for user', () => {
    const intel = computeWorkspaceIntelligence({
      items: [
        { id: '1', documentType: 'payment_request', requiresApproval: true, responsibleUserId: 'u1' },
        { id: '2', documentType: 'memo', requiresResponse: false, senderUserId: 'u2' },
      ],
      userId: 'u1',
      inboxCtx: { userId: 'u1', permissions: [] },
    });
    expect(intel.counts.actionRequired).toBe(1);
    expect(intel.counts.financePending).toBe(1);
  });

  it('suggests caught up when no actions', () => {
    const intel = computeWorkspaceIntelligence({
      items: [{ id: '1', documentType: 'memo', requiresApproval: false, requiresResponse: false }],
      userId: 'u1',
      inboxCtx: { userId: 'u1', permissions: [] },
    });
    expect(intel.suggestions.some((s) => s.id === 'caught-up')).toBe(true);
  });
});
