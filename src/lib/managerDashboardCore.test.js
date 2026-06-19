import { describe, it, expect } from 'vitest';
import {
  buildCashOutInboxRows,
  buildOrdersInboxRows,
  buildProcurementInboxRows,
  filterAttentionItems,
  flattenQuotationLineItems,
  formatRefundReasonCategory,
  ledgerTypeStyle,
  matchesInboxSearch,
  normalizeManagerInboxRoute,
  ymdLocal,
} from './managerDashboardCore';

describe('managerDashboardCore', () => {
  it('formats refund reason category arrays and strings', () => {
    expect(formatRefundReasonCategory('["Overpayment","Short delivery"]')).toBe('Overpayment, Short delivery');
    expect(formatRefundReasonCategory('Policy')).toBe('Policy');
  });

  it('flattens quotation line groups', () => {
    const lines = flattenQuotationLineItems({
      quotationLines: { products: [{ name: 'Longspan', qty: 4, unit: 'm', lineTotal: 2000 }] },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].category).toBe('products');
  });

  it('returns ledger style classes by type', () => {
    expect(ledgerTypeStyle('RECEIPT')).toContain('emerald');
    expect(ledgerTypeStyle('REFUND_OUT')).toContain('rose');
    expect(ledgerTypeStyle('RECEIPT', 'light')).toContain('emerald-100');
    expect(ledgerTypeStyle('REFUND_OUT', 'light')).toContain('rose-100');
  });

  it('matches inbox rows by tab-specific fields', () => {
    expect(matchesInboxSearch('qt-1', { id: 'QT-1', customer_name: 'Acme', status: 'Pending', _inboxKind: 'clearance' }, 'orders')).toBe(
      true
    );
    expect(
      matchesInboxSearch(
        'maintenance',
        { request_id: 'PR-1', description: 'Maintenance', expense_id: 'EXP-1', request_reference: '', _inboxKind: 'payment' },
        'cash_out'
      )
    ).toBe(true);
  });

  it('builds merged order and cash-out queues', () => {
    const orders = buildOrdersInboxRows({
      pendingClearance: [{ id: 'Q1' }],
      productionOverrides: [{ id: 'CL1', quotation_ref: 'Q2' }],
      flagged: [{ id: 'Q3' }],
    });
    expect(orders).toHaveLength(3);
    expect(orders[0]._inboxKind).toBe('flagged');
    expect(orders[1]._inboxKind).toBe('clearance');
    const cash = buildCashOutInboxRows({
      pendingRefunds: [{ refund_id: 'R1' }],
      pendingExpenses: [{ request_id: 'P1' }],
    });
    expect(cash).toHaveLength(2);
    const pos = buildProcurementInboxRows([{ po_id: 'PO-1', supplier_name: 'Steel Co' }]);
    expect(pos).toHaveLength(1);
    expect(pos[0]._inboxKind).toBe('purchase_order');
  });

  it('normalizes legacy inbox routes', () => {
    expect(normalizeManagerInboxRoute('clearance')).toEqual({ tab: 'orders', attentionFilter: 'orders' });
    expect(normalizeManagerInboxRoute('refunds')).toEqual({ tab: 'cash_out', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('flagged')).toEqual({ tab: 'attention', attentionFilter: 'flagged' });
    expect(normalizeManagerInboxRoute('material')).toEqual({ tab: 'material', attentionFilter: 'material' });
    expect(normalizeManagerInboxRoute('governance')).toEqual({ tab: 'governance', attentionFilter: 'all' });
    expect(normalizeManagerInboxRoute('procurement')).toEqual({ tab: 'procurement', attentionFilter: 'all' });
    expect(normalizeManagerInboxRoute('edits')).toEqual({ tab: 'edits', attentionFilter: 'all' });
  });

  it('filters attention items by chip', () => {
    const items = [
      { id: '1', kind: 'clearance' },
      { id: '2', kind: 'refunds' },
      { id: '3', kind: 'flagged' },
    ];
    expect(filterAttentionItems(items, 'cash')).toHaveLength(1);
    expect(filterAttentionItems(items, 'orders')).toHaveLength(2);
    expect(filterAttentionItems([{ kind: 'staff_purchase_credit' }], 'staff_credit')).toHaveLength(1);
  });

  it('formats local ymd date', () => {
    expect(ymdLocal(new Date('2026-04-09T10:00:00Z'))).toBe('2026-04-09');
  });
});

