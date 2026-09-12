import { describe, expect, it } from 'vitest';
import { domainsTouchedByDelta, mergeWriteDeltaIntoSnapshot } from './applyWriteDelta.js';

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
