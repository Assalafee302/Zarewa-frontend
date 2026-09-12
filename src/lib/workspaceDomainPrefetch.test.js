import { describe, expect, it } from 'vitest';
import {
  accessibleWorkspaceDomains,
  inferLoadedWorkspaceDomains,
  planDomainPrefetch,
  snapshotHasUsableDomainData,
  workspaceDomainSyncLabel,
  workspaceDomainsForPath,
} from './workspaceDomainPrefetch';

describe('workspaceDomainPrefetch', () => {
  it('accessibleWorkspaceDomains puts finance first for cashier', () => {
    const perms = ['cashier.desk.view', 'finance.pay', 'receipts.post'];
    expect(accessibleWorkspaceDomains(perms, 'cashier')).toEqual(['finance']);
  });

  it('accessibleWorkspaceDomains includes sales for cashier with sales desk keys', () => {
    const perms = ['cashier.desk.view', 'finance.pay', 'receipts.post', 'sales.view', 'quotations.manage'];
    expect(accessibleWorkspaceDomains(perms, 'cashier')).toEqual(['finance', 'sales']);
  });

  it('inferLoadedWorkspaceDomains skips deferred empty shell arrays', () => {
    const loaded = inferLoadedWorkspaceDomains({
      ok: true,
      customers: [],
      expenses: [],
      bootstrapMeta: { deferredDeskArrays: ['customers', 'expenses', 'coilLots'] },
    });
    expect(loaded.has('sales')).toBe(false);
    expect(loaded.has('finance')).toBe(false);
  });

  it('inferLoadedWorkspaceDomains treats mode=shell as unloaded', () => {
    const loaded = inferLoadedWorkspaceDomains({
      ok: true,
      customers: [{ customerID: 'C1' }],
      bootstrapMeta: { mode: 'shell', deferredDeskArrays: ['customers'] },
    });
    expect(loaded.size).toBe(0);
  });

  it('planDomainPrefetch keeps only the primary domain on constrained links', () => {
    expect(planDomainPrefetch(['sales', 'finance', 'operations'], { constrained: true })).toEqual([
      'sales',
    ]);
    expect(planDomainPrefetch(['sales', 'finance'], { forceAll: true, constrained: true })).toEqual([
      'sales',
      'finance',
    ]);
  });

  it('planDomainPrefetch defaults to primary only unless warmSecondary on a healthy link', () => {
    expect(planDomainPrefetch(['sales', 'finance', 'operations'], { constrained: false })).toEqual([
      'sales',
    ]);
    expect(
      planDomainPrefetch(['sales', 'finance', 'operations'], {
        constrained: false,
        warmSecondary: true,
      })
    ).toEqual(['sales', 'finance', 'operations']);
    expect(
      planDomainPrefetch(['sales', 'finance'], { constrained: false, rttMs: 1200, warmSecondary: true })
    ).toEqual(['sales']);
  });

  it('inferLoadedWorkspaceDomains marks domains present in session cache', () => {
    const loaded = inferLoadedWorkspaceDomains({
      ok: true,
      customers: [{ customerID: 'C1' }],
      expenses: [{ expenseID: 'E1' }],
      coilLots: [{ coilNo: 'CL-1' }],
      suppliers: [{ supplierID: 'S1' }],
      purchaseOrders: [{ poID: 'PO-1' }],
    });
    expect([...loaded]).toEqual(expect.arrayContaining(['sales', 'finance', 'operations', 'procurement']));
  });

  it('does not call procurement loaded just because suppliers are on the shell', () => {
    // Suppliers ship with the first paint now, so their presence says nothing about the
    // pack. Treating it as proof would short-circuit ensureDomainLoaded and leave
    // purchase orders missing for good — while lookups reported them absent rather than
    // still loading, which is the lie this whole change exists to remove.
    const loaded = inferLoadedWorkspaceDomains({
      ok: true,
      suppliers: [{ supplierID: 'S1' }],
      transportAgents: [{ agentID: 'TA-1' }],
      purchaseOrders: [],
    });
    expect(loaded.has('procurement')).toBe(false);
  });

  it('snapshotHasUsableDomainData agrees: suppliers alone are not procurement', () => {
    expect(
      snapshotHasUsableDomainData({ ok: true, suppliers: [{ supplierID: 'S1' }], purchaseOrders: [] }, 'procurement')
    ).toBe(false);
    expect(
      snapshotHasUsableDomainData({ ok: true, purchaseOrders: [{ poID: 'PO-1' }] }, 'procurement')
    ).toBe(true);
  });

  it('workspaceDomainsForPath maps finance routes', () => {
    expect(workspaceDomainsForPath('/accounts?tab=desk')).toEqual(['finance', 'sales']);
  });

  it('workspaceDomainsForPath warms manager watch queues', () => {
    expect(workspaceDomainsForPath('/manager')).toEqual(['finance', 'sales', 'operations']);
  });

  it('workspaceDomainSyncLabel joins multi-domain labels', () => {
    expect(workspaceDomainSyncLabel(['finance', 'sales'])).toBe('finance register & sales register');
  });

  it('snapshotHasUsableDomainData detects finance expenses, not sales receipts alone', () => {
    expect(
      snapshotHasUsableDomainData({ ok: true, receipts: [{ receiptId: 'R1' }] }, 'finance')
    ).toBe(false);
    expect(
      snapshotHasUsableDomainData({ ok: true, expenses: [{ expenseID: 'E1' }] }, 'finance')
    ).toBe(true);
  });

  it('snapshotHasUsableDomainData respects deferred shell keys', () => {
    expect(
      snapshotHasUsableDomainData(
        {
          ok: true,
          customers: [{ customerID: 'C1' }],
          bootstrapMeta: { deferredDeskArrays: ['customers'] },
        },
        'sales'
      )
    ).toBe(false);
  });
});
