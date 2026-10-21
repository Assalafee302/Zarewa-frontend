import { describe, it, expect } from 'vitest';
import {
  approvalListCustomerName,
  approvalOrderRowDetail,
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
  it('shows the customer once on an order row and does not repeat the quotation number', () => {
    const detail = approvalOrderRowDetail(
      {
        kind: 'clearance',
        title: 'QT-1522',
        quotationRef: 'QT-1522',
        subtitle: 'Alhaji Musa',
        row: { id: 'QT-1522', customer_name: 'Alhaji Musa' },
      },
      { sentence: 'QT-1522: ₦50,000 paid of ₦100,000 (50%) and not yet cleared by a manager' }
    );
    expect(detail).toBe('Alhaji Musa · ₦50,000 paid of ₦100,000 (50%) and not yet cleared by a manager');
    expect(detail.includes('QT-1522')).toBe(false);
  });

  it('puts the customer on every approval list, and does not repeat a name the sentence already has', () => {
    const conversion = approvalOrderRowDetail(
      {
        kind: 'conversions',
        title: 'PRO-1',
        quotationRef: 'QT-9',
        row: { job_id: 'PRO-1', quotation_ref: 'QT-9', customer_name: 'Grace Bature' },
      },
      { sentence: 'Job PRO-1 (QT-9) made 12 m — conversion HIGH, not signed off' }
    );
    expect(conversion.startsWith('Grace Bature · ')).toBe(true);
    expect(conversion.includes('QT-9')).toBe(true);

    const refund = approvalOrderRowDetail(
      {
        kind: 'refunds',
        title: 'RF-1',
        quotationRef: 'QT-9',
        row: { customer_name: 'Tahir Musa', quotation_ref: 'QT-9' },
      },
      { sentence: 'Refund ₦10,000 to Tahir Musa (Overpayment) is waiting for approval' }
    );
    expect(refund).toBe('Refund ₦10,000 to Tahir Musa (Overpayment) is waiting for approval');
    expect(approvalListCustomerName({ kind: 'refunds', row: { customer_name: 'Tahir Musa' } })).toBe('Tahir Musa');

    const expense = approvalOrderRowDetail(
      { kind: 'payments', title: 'PR-1', row: { description: 'Diesel' } },
      { sentence: 'Payment request ₦20,000 for Diesel is waiting for approval' }
    );
    expect(expense).toBe('Payment request ₦20,000 for Diesel is waiting for approval');
  });

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

