import { describe, it, expect } from 'vitest';
import { searchWorkspaceSnapshot } from './workspaceSearchLocal';
import { mergeWorkspaceSearchResults } from '../shared/lib/workspaceSearchCore.js';

describe('workspaceSearchSnapshot coil search', () => {
  it('returns direct coil profile path for coil query', () => {
    const snapshot = {
      coilLots: [
        {
          coilNo: 'CL-TEST-001',
          productID: 'COIL-ALU',
          poID: 'PO-1',
          supplierName: 'Mill One',
          colour: 'Blue',
          gaugeLabel: '0.45',
        },
      ],
    };
    const hasPermission = () => true;
    const rows = searchWorkspaceSnapshot(snapshot, 'cl-test-001', hasPermission, 20);
    expect(rows.some((r) => r.kind === 'coil' && r.path === '/operations/coils/CL-TEST-001')).toBe(true);
  });

  it('includes navigation command for module query', () => {
    const snapshot = { permissions: ['sales.view'] };
    const hasPermission = (p) => p === 'sales.view' || p === '*';
    const rows = searchWorkspaceSnapshot(snapshot, 'sales', hasPermission, 20);
    expect(rows.some((r) => r.kind === 'nav' && r.path === '/sales')).toBe(true);
  });

  it('searches unified work items offline', () => {
    const snapshot = {
      unifiedWorkItems: [
        {
          id: 'WI-1',
          title: 'Fuel memo review',
          referenceNo: 'REF-9',
          documentType: 'office_memo',
          status: 'Open',
        },
      ],
    };
    const hasPermission = () => true;
    const rows = searchWorkspaceSnapshot(snapshot, 'fuel memo', hasPermission, 20);
    expect(rows.some((r) => r.kind === 'work_item' && r.id === 'WI-1')).toBe(true);
  });

  it('fuzzy-matches customer names offline', () => {
    const snapshot = {
      customers: [{ customerID: 'CU-1', name: 'Musa Hassan' }],
      permissions: ['sales.view'],
    };
    const hasPermission = (p) => p === 'sales.view' || p === '*';
    const rows = searchWorkspaceSnapshot(snapshot, 'mousa', hasPermission, 20, {
      contextPath: '/sales',
    });
    expect(rows.some((r) => r.kind === 'customer')).toBe(true);
  });

  it('searches GL journals from bootstrap slice offline', () => {
    const snapshot = {
      glJournalSearchSlice: [{ id: 'GL-9', entryDateISO: '2026-01-01', memo: 'Fuel accrual', sourceId: 'EXP-1' }],
      permissions: ['finance.view'],
    };
    const hasPermission = (p) => p === 'finance.view' || p === '*';
    const rows = searchWorkspaceSnapshot(snapshot, 'fuel', hasPermission, 20);
    expect(rows.some((r) => r.kind === 'gl_journal' && r.id === 'GL-9')).toBe(true);
  });

  it('reserves slots across categories via merge', () => {
    const customers = Array.from({ length: 8 }, (_, i) => ({
      kind: 'customer',
      id: `C${i}`,
      label: `C${i}`,
      path: '/',
      _score: 900 - i,
    }));
    const coils = [{ kind: 'coil', id: 'CL-1', label: 'CL-1', path: '/', _score: 950 }];
    const merged = mergeWorkspaceSearchResults({ customer: customers, coil: coils }, { totalCap: 5, minPerKind: 1 });
    expect(merged.some((r) => r.kind === 'coil')).toBe(true);
  });
});
