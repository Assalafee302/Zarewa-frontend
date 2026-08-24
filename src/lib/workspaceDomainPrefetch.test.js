import { describe, expect, it } from 'vitest';
import {
  accessibleWorkspaceDomains,
  inferLoadedWorkspaceDomains,
  snapshotHasUsableDomainData,
  workspaceDomainSyncLabel,
  workspaceDomainsForPath,
} from './workspaceDomainPrefetch';

describe('workspaceDomainPrefetch', () => {
  it('accessibleWorkspaceDomains puts finance first for cashier', () => {
    const perms = ['cashier.desk.view', 'finance.pay', 'receipts.post'];
    expect(accessibleWorkspaceDomains(perms, 'cashier')).toEqual(['finance']);
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

  it('inferLoadedWorkspaceDomains marks domains present in session cache', () => {
    const loaded = inferLoadedWorkspaceDomains({
      ok: true,
      customers: [{ customerID: 'C1' }],
      expenses: [{ expenseID: 'E1' }],
      coilLots: [{ coilNo: 'CL-1' }],
      suppliers: [{ supplierID: 'S1' }],
      purchaseOrders: [],
    });
    expect([...loaded]).toEqual(expect.arrayContaining(['sales', 'finance', 'operations', 'procurement']));
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

  it('snapshotHasUsableDomainData detects finance receipts', () => {
    expect(
      snapshotHasUsableDomainData({ ok: true, receipts: [{ receiptId: 'R1' }] }, 'finance')
    ).toBe(true);
  });
});
