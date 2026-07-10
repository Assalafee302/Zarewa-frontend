import { describe, it, expect } from 'vitest';
import {
  resolveGlobalSearchEnterFallback,
  resolveTransactionSearchHit,
} from './workspaceSearchCore.js';

describe('resolveTransactionSearchHit', () => {
  it('opens manager clearance intel for quotations', () => {
    const hit = resolveTransactionSearchHit(
      { kind: 'quotation', id: 'QT-9', label: 'QT-9', path: '/sales' },
      { openManagerIntel: true }
    );
    expect(hit.path).toBe('/manager?quoteRef=QT-9');
    expect(hit.state).toBeUndefined();
  });

  it('opens manager refund preview for refunds', () => {
    const hit = resolveTransactionSearchHit(
      { kind: 'refund', id: 'RF-1', label: 'RF-1', path: '/sales' },
      { openManagerIntel: true }
    );
    expect(hit.path).toBe('/manager?refundId=RF-1');
  });

  it('opens parent quote intel for receipts with quotationRef', () => {
    const hit = resolveTransactionSearchHit(
      {
        kind: 'receipt',
        id: 'RCP-1',
        label: 'RCP-1',
        path: '/sales',
        state: { quotationRef: 'QT-2' },
      },
      { openManagerIntel: true }
    );
    expect(hit.path).toBe('/manager?quoteRef=QT-2');
  });

  it('opens sales record when manager intel is not available', () => {
    const hit = resolveTransactionSearchHit(
      { kind: 'quotation', id: 'QT-9', label: 'QT-9', path: '/sales' },
      { openManagerIntel: false }
    );
    expect(hit.path).toBe('/sales');
    expect(hit.state.openSalesRecord).toEqual({ type: 'quotation', id: 'QT-9' });
  });

  it('resolveGlobalSearchEnterFallback uses manager intel when requested', () => {
    const fb = resolveGlobalSearchEnterFallback('QT-55', { openManagerIntel: true });
    expect(fb?.path).toBe('/manager?quoteRef=QT-55');
  });
});
