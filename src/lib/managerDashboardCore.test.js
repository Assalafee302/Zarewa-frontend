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
  normalizeAttentionFilter,
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

  it('normalizes legacy inbox routes onto Needs approval + filter', () => {
    expect(normalizeManagerInboxRoute('clearance')).toEqual({ tab: 'attention', attentionFilter: 'orders' });
    expect(normalizeManagerInboxRoute('refunds')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('cash')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('cash_out')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('payments')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('flagged')).toEqual({ tab: 'attention', attentionFilter: 'orders' });
    expect(normalizeManagerInboxRoute('material')).toEqual({ tab: 'attention', attentionFilter: 'operations' });
    expect(normalizeManagerInboxRoute('governance')).toEqual({ tab: 'attention', attentionFilter: 'control' });
    expect(normalizeManagerInboxRoute('procurement')).toEqual({ tab: 'attention', attentionFilter: 'operations' });
    expect(normalizeManagerInboxRoute('edits')).toEqual({ tab: 'attention', attentionFilter: 'edits' });
    expect(normalizeManagerInboxRoute('overtime')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('ot')).toEqual({ tab: 'attention', attentionFilter: 'cash' });
    expect(normalizeManagerInboxRoute('credit')).toEqual({ tab: 'credit', attentionFilter: 'all' });
    expect(normalizeManagerInboxRoute('issues')).toEqual({ tab: 'issues', attentionFilter: 'all' });
  });

  it('filters attention items by merged chips', () => {
    const items = [
      { id: '1', kind: 'clearance' },
      { id: '2', kind: 'refunds' },
      { id: '3', kind: 'flagged' },
      { id: '4', kind: 'payments' },
      { id: '5', kind: 'overtime' },
      { id: '6', kind: 'material' },
      { id: '7', kind: 'edit_approvals' },
    ];
    expect(filterAttentionItems(items, 'refunds')).toHaveLength(3);
    expect(filterAttentionItems(items, 'cash')).toHaveLength(3);
    expect(filterAttentionItems(items, 'expenses')).toHaveLength(3);
    expect(filterAttentionItems(items, 'orders')).toHaveLength(2);
    expect(filterAttentionItems(items, 'overtime')).toHaveLength(3);
    expect(filterAttentionItems(items, 'operations')).toHaveLength(1);
    expect(filterAttentionItems(items, 'control')).toHaveLength(0);
    expect(filterAttentionItems(items, 'edits')).toHaveLength(1);
    expect(filterAttentionItems([{ kind: 'staff_purchase_credit' }], 'staff_credit')).toHaveLength(1);
    expect(filterAttentionItems([{ kind: 'staff_purchase_credit' }], 'orders')).toHaveLength(1);
    expect(normalizeAttentionFilter('refunds')).toBe('cash');
    expect(normalizeAttentionFilter('qc')).toBe('operations');
    expect(normalizeAttentionFilter('edits')).toBe('edits');
    expect(normalizeAttentionFilter('edit_approvals')).toBe('edits');
  });

  it('formats local ymd date', () => {
    expect(ymdLocal(new Date('2026-04-09T10:00:00Z'))).toBe('2026-04-09');
  });
});

