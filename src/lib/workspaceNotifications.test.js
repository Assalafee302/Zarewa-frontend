import { describe, expect, it } from 'vitest';
import { buildWorkspaceNotifications, sortWorkspaceNotifications } from './workspaceNotifications.js';

const baseSnapshot = {
  permissions: ['sales.manage', 'refunds.approve', 'finance.approve'],
  session: { user: { id: 'u1', roleKey: 'sales_manager' }, permissions: ['sales.manage', 'refunds.approve'] },
  quotations: [
    { id: 'Q1', paidNgn: 1000, totalNgn: 1000, customer: 'Acme', dateISO: '2026-06-01' },
    { id: 'Q2', paidNgn: 500, totalNgn: 1000, managerFlaggedAtISO: '2026-06-02', customer: 'Beta' },
  ],
  refunds: [{ refundID: 'R1', status: 'Pending', amountNgn: 100, customer: 'Acme', quotationRef: 'Q1' }],
  paymentRequests: [{ requestID: 'P1', approvalStatus: 'Pending', amountRequestedNgn: 200, description: 'Fuel' }],
  materialIncidents: [{ id: 'M1', status: 'submitted', incident_type: 'yard_offcut' }],
  unifiedWorkItems: [],
};

const attentionPayload = {
  summary: { total: 2, byKind: { flagged: 1, clearance: 1 } },
  items: [
    {
      id: 'flagged:Q2',
      kind: 'flagged',
      priority: 92,
      title: 'Q2',
      subtitle: 'Beta Ltd',
      quotationRef: 'Q2',
    },
    {
      id: 'clearance:Q1',
      kind: 'clearance',
      priority: 70,
      title: 'Q1',
      subtitle: 'Acme',
      quotationRef: 'Q1',
    },
  ],
};

describe('workspaceNotifications', () => {
  it('surfaces row-level attention alerts with deep links', () => {
    const items = buildWorkspaceNotifications({
      snapshot: baseSnapshot,
      hasPermission: (p) => p === '*' || ['sales.manage', 'refunds.approve', 'finance.approve'].includes(p),
      canAccessModule: () => true,
      managementAttention: attentionPayload,
    });
    const row = items.find((n) => n.id === 'attention-row:flagged:Q2');
    expect(row).toBeTruthy();
    expect(row.path).toContain('quoteRef=Q2');
    expect(items.find((n) => n.id === 'mgr-order-review')).toBeFalsy();
    expect(items.find((n) => n.id === 'mgr-material-exceptions')).toBeTruthy();
  });

  it('falls back to snapshot attention rows when management API unavailable', () => {
    const items = buildWorkspaceNotifications({
      snapshot: baseSnapshot,
      hasPermission: (p) => p === '*' || ['sales.manage', 'refunds.approve', 'finance.approve'].includes(p),
      canAccessModule: () => true,
    });
    const flaggedRow = items.find((n) => n.id === 'attention-row:flagged:Q2');
    expect(flaggedRow).toBeTruthy();
    expect(flaggedRow.path).toContain('quoteRef=Q2');
    expect(items.find((n) => n.id === 'mgr-order-review')).toBeFalsy();
  });

  it('uses snapshot products for low stock', () => {
    const items = buildWorkspaceNotifications({
      snapshot: {
        ...baseSnapshot,
        products: [{ productID: 'P1', name: 'Sheet A', stockLevel: 5, lowStockThreshold: 100 }],
      },
      hasPermission: (p) => p === '*',
      canAccessModule: (m) => m === 'operations',
    });
    const low = items.find((n) => n.id === 'low-stock');
    expect(low?.detail).toContain('Sheet A');
  });

  it('sorts critical alerts ahead of info', () => {
    const sorted = sortWorkspaceNotifications([
      { title: 'B', severity: 'info', priority: 30 },
      { title: 'A', severity: 'critical', priority: 95 },
    ]);
    expect(sorted[0].severity).toBe('critical');
  });
});
