import { describe, expect, it } from 'vitest';
import {
  categoryForWorkItem,
  workItemMatchesCategory,
  WORKSPACE_CATEGORY_LABELS,
} from './workspaceCategoryRegistry.js';

describe('workspaceCategoryRegistry', () => {
  it('maps finance document types', () => {
    expect(categoryForWorkItem({ documentType: 'payment_request' })).toBe('finance');
    expect(categoryForWorkItem({ documentType: 'refund_request' })).toBe('finance');
  });

  it('maps office threads to memos', () => {
    expect(categoryForWorkItem({ sourceKind: 'office_thread', documentType: 'memo' })).toBe('memos');
    expect(categoryForWorkItem({ linkedThreadId: 'OT-1', documentType: 'request' })).toBe('memos');
  });

  it('maps inventory from coil requests', () => {
    expect(categoryForWorkItem({ documentType: 'material_request' })).toBe('inventory');
    expect(categoryForWorkItem({ sourceKind: 'coil_request' })).toBe('inventory');
  });

  it('filters by category with all passthrough', () => {
    const item = { documentType: 'payment_request' };
    expect(workItemMatchesCategory(item, 'all')).toBe(true);
    expect(workItemMatchesCategory(item, 'finance')).toBe(true);
    expect(workItemMatchesCategory(item, 'sales')).toBe(false);
  });

  it('exposes ERP-native labels', () => {
    expect(WORKSPACE_CATEGORY_LABELS.finance).toBe('Finance');
    expect(WORKSPACE_CATEGORY_LABELS.management).toBe('Management');
  });
});
