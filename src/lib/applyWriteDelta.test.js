import { describe, expect, it } from 'vitest';
import {
  domainsTouchedByDelta,
  entityIdsFromDelta,
  eventIsOwnWriteEcho,
  mergeWriteDeltaIntoSnapshot,
} from './applyWriteDelta.js';

describe('applyWriteDelta', () => {
  it('domainsTouchedByDelta maps bags to desks', () => {
    expect(
      domainsTouchedByDelta({
        receipts: [{ id: 'RC-1' }],
        productionJobs: [{ jobID: 'JOB-1' }],
      }).sort()
    ).toEqual(['finance', 'operations', 'sales']);
  });

  it('merges quotation and receipt rows without dropping prior lines', () => {
    const prev = {
      ok: true,
      quotations: [
        {
          id: 'QT-1',
          paidNgn: 0,
          quotationLines: { products: [{ name: 'Sheet' }] },
        },
      ],
      receipts: [],
    };
    const { next, changed, domains } = mergeWriteDeltaIntoSnapshot(prev, {
      quotations: [{ id: 'QT-1', paidNgn: 50_000, customer: 'ada okonkwo' }],
      receipts: [{ id: 'RC-1', quotationRef: 'QT-1', amountNgn: 50_000 }],
    });
    expect(changed).toBe(true);
    expect(domains).toEqual(expect.arrayContaining(['sales', 'finance']));
    expect(next.quotations[0].paidNgn).toBe(50_000);
    expect(next.quotations[0].quotationLines.products[0].name).toBe('Sheet');
    expect(next.quotations[0].customer).toBe('Ada Okonkwo');
    expect(next.receipts[0].id).toBe('RC-1');
  });

  it('prepends new production jobs', () => {
    const prev = { ok: true, productionJobs: [{ jobID: 'JOB-OLD', status: 'Completed' }] };
    const { next, changed } = mergeWriteDeltaIntoSnapshot(prev, {
      productionJobs: [{ jobID: 'JOB-NEW', status: 'Planned' }],
    });
    expect(changed).toBe(true);
    expect(next.productionJobs.map((j) => j.jobID)).toEqual(['JOB-NEW', 'JOB-OLD']);
  });
});

describe('entityIdsFromDelta', () => {
  it('reads ids per bag', () => {
    const ids = entityIdsFromDelta({
      quotations: [{ id: 'QT-1' }, { id: 'QT-2' }],
      refunds: [{ refundID: 'RF-9' }],
    });
    expect([...ids.get('quotations')]).toEqual(['QT-1', 'QT-2']);
    expect([...ids.get('refunds')]).toEqual(['RF-9']);
  });

  it('uses the same field chain the server broadcasts with', () => {
    // A set built from any other field would never match an event, quietly turning the
    // echo check into "always refetch" — which is a slow desk, not a wrong one, so it
    // would go unnoticed.
    const ids = entityIdsFromDelta({
      productionJobs: [{ jobID: 'PJ-1' }],
      purchaseOrders: [{ poID: 'PO-1' }],
      cuttingLists: [{ quotationId: 'QT-7' }],
    });
    expect([...ids.get('productionJobs')]).toEqual(['PJ-1']);
    expect([...ids.get('purchaseOrders')]).toEqual(['PO-1']);
    expect([...ids.get('cuttingLists')]).toEqual(['QT-7']);
  });

  it('skips rows with no usable id and empty bags', () => {
    const ids = entityIdsFromDelta({ quotations: [{}, null, { id: '  ' }], receipts: [] });
    expect(ids.size).toBe(0);
  });

  it('is empty for a missing delta', () => {
    expect(entityIdsFromDelta(null).size).toBe(0);
    expect(entityIdsFromDelta(undefined).size).toBe(0);
  });
});

describe('eventIsOwnWriteEcho', () => {
  const mine = () => new Map([['quotations', new Set(['QT-1'])]]);

  it('recognises the echo of our own save', () => {
    expect(eventIsOwnWriteEcho({ quotations: ['QT-1'] }, mine())).toBe(true);
  });

  it("does not swallow a colleague's save on the same desk", () => {
    // The whole point. Skipping by desk meant anyone else saving within the window went
    // unseen until the ninety-second poll — the delay this stream exists to remove.
    expect(eventIsOwnWriteEcho({ quotations: ['QT-2'] }, mine())).toBe(false);
  });

  it('refetches when an event mixes our row with someone else’s', () => {
    expect(eventIsOwnWriteEcho({ quotations: ['QT-1', 'QT-2'] }, mine())).toBe(false);
  });

  it('refetches when the event names a bag we did not write', () => {
    expect(eventIsOwnWriteEcho({ refunds: ['RF-1'] }, mine())).toBe(false);
  });

  it('treats an event with no ids as somebody else’s', () => {
    // Unprovable means not ours: a needless 304 costs a few hundred bytes, a missed write
    // costs ninety seconds of someone staring at a stale list.
    expect(eventIsOwnWriteEcho(undefined, mine())).toBe(false);
    expect(eventIsOwnWriteEcho({}, mine())).toBe(false);
    expect(eventIsOwnWriteEcho({ quotations: [] }, mine())).toBe(false);
  });

  it('is false when we have written nothing', () => {
    expect(eventIsOwnWriteEcho({ quotations: ['QT-1'] }, new Map())).toBe(false);
  });
});
