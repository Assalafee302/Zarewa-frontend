import { describe, expect, it } from 'vitest';
import {
  buildManagerSnapshotsFromWorkspace,
  topCustomersByNetPaymentsAndMeters,
} from './managementLiveFromWorkspace.js';

describe('topCustomersByNetPaymentsAndMeters', () => {
  it('ranks by net payments minus refunds and includes cutting-list metres', () => {
    const quoteById = new Map([['Q1', { id: 'Q1', customerID: 'C1', customer: 'Alpha Ltd' }]]);
    const rows = topCustomersByNetPaymentsAndMeters(
      [
        { customerID: 'C1', customer: 'Alpha Ltd', dateISO: '2026-05-10', amountNgn: 500_000 },
        { customerID: 'C2', customer: 'Beta Co', dateISO: '2026-05-12', amountNgn: 300_000 },
      ],
      [
        {
          customerID: 'C1',
          customer: 'Alpha Ltd',
          requestedAtISO: '2026-05-15',
          status: 'Paid',
          paidAmountNgn: 50_000,
        },
      ],
      [
        { customerID: 'C1', quotationRef: 'Q1', dateISO: '2026-05-11', totalMeters: 1200 },
        { customerID: 'C2', dateISO: '2026-05-13', totalMeters: 800 },
      ],
      quoteById,
      '2026-05-01',
      5
    );
    expect(rows[0].customer_id).toBe('C1');
    expect(rows[0].netCollectedNgn).toBe(450_000);
    expect(rows[0].cuttingListMeters).toBe(1200);
    expect(rows[1].netCollectedNgn).toBe(300_000);
    expect(rows[1].cuttingListMeters).toBe(800);
  });
});

describe('buildManagerSnapshotsFromWorkspace', () => {
  it('exposes topCustomers from receipts, refunds, and cutting lists', () => {
    const snap = buildManagerSnapshotsFromWorkspace(
      [{ id: 'Q1', customerID: 'C1', customer: 'Alpha', dateISO: '2026-06-10', totalNgn: 900_000 }],
      [{ customerID: 'C1', quotationRef: 'Q1', dateISO: '2026-06-11', totalMeters: 500 }],
      [],
      0,
      { nairaTarget: 1, meterTarget: 1 },
      'month',
      [{ customerID: 'C1', customer: 'Alpha', dateISO: '2026-06-12', amountNgn: 200_000 }],
      []
    );
    expect(snap.topCustomers).toHaveLength(1);
    expect(snap.topCustomers[0].netCollectedNgn).toBe(200_000);
    expect(snap.topCustomers[0].cuttingListMeters).toBe(500);
  });
});
