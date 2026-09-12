import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_ARRAY_DOMAINS,
  lookupWorkspaceEntity,
  workspaceArrayIsLoaded,
  workspaceIdField,
  workspaceList,
} from './workspaceEntityLookup';

const loaded = (...domains) => (d) => domains.includes(d);
const nothingLoaded = () => false;

describe('lookupWorkspaceEntity', () => {
  const snap = { quotations: [{ id: 'QT-1', totalNgn: 100 }] };

  it('finds a row that is there', () => {
    const r = lookupWorkspaceEntity(snap, 'quotations', 'QT-1', { isDomainLoaded: loaded('sales') });
    expect(r.state).toBe('found');
    expect(r.value.totalNgn).toBe(100);
  });

  it('says not-loaded, not absent, when the owning pack has not arrived', () => {
    // The whole point: a cutting list opened before the sales pack lands must not report
    // that its quotation does not exist.
    const r = lookupWorkspaceEntity({ quotations: [] }, 'quotations', 'QT-9', {
      isDomainLoaded: nothingLoaded,
    });
    expect(r.state).toBe('not-loaded');
    expect(r.value).toBe(null);
  });

  it('says absent once the pack is in and the row still is not', () => {
    const r = lookupWorkspaceEntity(snap, 'quotations', 'QT-404', {
      isDomainLoaded: loaded('sales'),
    });
    expect(r.state).toBe('absent');
  });

  it('counts an array as loaded when any supplying pack has arrived', () => {
    // A cashier gets receipts from finance without the sales pack; telling them sales
    // data is still loading would be wrong.
    const r = lookupWorkspaceEntity({ receipts: [{ id: 'RC-1' }] }, 'receipts', 'RC-2', {
      isDomainLoaded: loaded('finance'),
    });
    expect(r.state).toBe('absent');
  });

  it('uses the right id field per array', () => {
    const r = lookupWorkspaceEntity({ suppliers: [{ supplierID: 'SUP-1' }] }, 'suppliers', 'SUP-1', {
      isDomainLoaded: loaded('procurement'),
    });
    expect(r.state).toBe('found');
  });

  it('accepts a custom matcher for refs that need normalising', () => {
    const r = lookupWorkspaceEntity(snap, 'quotations', '', {
      isDomainLoaded: loaded('sales'),
      match: (row) => row.id.toLowerCase() === 'qt-1',
    });
    expect(r.state).toBe('found');
  });

  it('treats shell-resident arrays as always loaded', () => {
    // Unmapped arrays ride the first paint, so a miss there is a real miss.
    const r = lookupWorkspaceEntity({ workspaceBranches: [] }, 'workspaceBranches', 'B1', {
      isDomainLoaded: nothingLoaded,
    });
    expect(r.state).toBe('absent');
  });

  it('does not crash on a missing snapshot or blank id', () => {
    expect(lookupWorkspaceEntity(null, 'quotations', 'QT-1').state).toBe('absent');
    expect(lookupWorkspaceEntity(snap, 'quotations', '  ').state).toBe('absent');
  });
});

describe('workspaceList', () => {
  it('does not present an empty picker as a complete one', () => {
    // An empty supplier dropdown reads as "no suppliers exist", which is the same lie
    // in list form.
    const r = workspaceList({ suppliers: [] }, 'suppliers', nothingLoaded);
    expect(r.state).toBe('not-loaded');
  });

  it('is ready once the pack is in, even with genuinely nothing in it', () => {
    // Keyed on the domain, not on length — a branch with no suppliers must not spin.
    const r = workspaceList({ suppliers: [] }, 'suppliers', loaded('procurement'));
    expect(r.state).toBe('ready');
    expect(r.rows).toEqual([]);
  });

  it('is ready whenever rows are present', () => {
    const r = workspaceList({ suppliers: [{ supplierID: 'S1' }] }, 'suppliers', nothingLoaded);
    expect(r.state).toBe('ready');
  });
});

describe('the domain map', () => {
  it('only names real domains', () => {
    const known = new Set(['sales', 'operations', 'finance', 'procurement']);
    for (const [key, domains] of Object.entries(WORKSPACE_ARRAY_DOMAINS)) {
      expect(domains.length, `${key} has no domain`).toBeGreaterThan(0);
      for (const d of domains) expect(known.has(d), `${key} → ${d}`).toBe(true);
    }
  });

  it('defaults the id field to id, with the known exceptions named', () => {
    expect(workspaceIdField('quotations')).toBe('id');
    expect(workspaceIdField('suppliers')).toBe('supplierID');
    expect(workspaceIdField('purchaseOrders')).toBe('poID');
  });

  it('treats an unmapped array as loaded rather than blocking on it', () => {
    expect(workspaceArrayIsLoaded('somethingNew', nothingLoaded)).toBe(true);
  });
});
