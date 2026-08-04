import { describe, it, expect } from 'vitest';
import {
  buildStoreClearanceRows,
  buildStorePulseCounts,
  normalizeOpsFocusTab,
} from './storeClearanceRank.js';

describe('storeClearanceRank', () => {
  it('ranks need-coil above register, then receive/pod', () => {
    const rows = buildStoreClearanceRows({
      pendingProductions: [
        {
          id: 'CL-1',
          customer: 'Acme',
          label: 'Quote Q-1',
          reason: 'Awaiting production registration',
          severity: 'high',
        },
        {
          id: 'CL-2',
          customer: 'Beta',
          label: 'Spec',
          reason: 'Coils not allocated — shop floor blocked',
          severity: 'critical',
        },
      ],
      receiveCount: 2,
      podPendingCount: 1,
      maxRows: 10,
    });
    expect(rows[0].kind).toBe('need_coil');
    expect(rows.some((r) => r.kind === 'register')).toBe(true);
    expect(rows.some((r) => r.kind === 'pod')).toBe(true);
    expect(rows.some((r) => r.kind === 'receive')).toBe(true);
    expect(rows.find((r) => r.kind === 'need_coil')?.action).toBe('register');
    expect(rows.find((r) => r.refId === 'CL-1')?.cta).toBe('Open register');
  });

  it('keeps idle/restock when production fills maxRows', () => {
    const pendingProductions = Array.from({ length: 12 }, (_, i) => ({
      id: `CL-${i}`,
      customer: `C${i}`,
      label: `L${i}`,
      reason: 'Awaiting production registration',
      severity: 'high',
    }));
    const rows = buildStoreClearanceRows({
      pendingProductions,
      idleRows: [
        {
          id: 'idle-1',
          kind: 'idle',
          title: 'Idle stock',
          detail: 'Spec A',
          severity: 'warn',
          score: 75,
          cta: 'Review',
          action: 'onhand_coil',
        },
      ],
      restockRows: [
        {
          id: 'restock-1',
          kind: 'restock',
          title: 'Restock',
          detail: 'Spec B',
          severity: 'high',
          score: 88,
          cta: 'Request',
          action: 'request_stock',
        },
      ],
      maxRows: 10,
    });
    expect(rows.some((r) => r.kind === 'idle')).toBe(true);
    expect(rows.some((r) => r.kind === 'restock')).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(10);
  });

  it('builds pulse counts without double-counting need-coil as register', () => {
    const pulse = buildStorePulseCounts({
      pendingProductions: [
        { reason: 'Awaiting production registration' },
        { reason: 'Coils not allocated' },
      ],
      receiveCount: 3,
      podPendingCount: 2,
      pendingMexCount: 1,
      noCoilCount: 4,
    });
    expect(pulse.register).toBe(1);
    expect(pulse.needCoil).toBe(4);
    expect(pulse.receive).toBe(3);
    expect(pulse.pod).toBe(2);
    expect(pulse.exceptions).toBe(1);
  });

  it('normalizes focus tab aliases', () => {
    expect(normalizeOpsFocusTab('clear')).toEqual({ tab: 'overview' });
    expect(normalizeOpsFocusTab('onhand')).toEqual({ tab: 'inventory' });
    expect(normalizeOpsFocusTab('register')).toEqual({ tab: 'production' });
    expect(normalizeOpsFocusTab('deliveries')).toEqual({ tab: 'overview', deliveriesFocus: true });
    expect(normalizeOpsFocusTab('exceptions')?.tab).toBe('materialExceptions');
    expect(normalizeOpsFocusTab('overtime')?.tab).toBe('overtime');
    expect(normalizeOpsFocusTab('ot')?.tab).toBe('overtime');
  });
});
