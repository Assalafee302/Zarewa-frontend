import { describe, expect, it } from 'vitest';
import {
  buildCoilLife,
  buildCoilTimeline,
  jobKgTypingCheck,
  latestJobRows,
  rollFinishCheck,
} from './coilExpectedLife';
import { splitSupplierAdvanceRows } from './supplierAdvanceBuckets';

const aluzinc = {
  coilNo: 'CL-1',
  materialTypeName: 'Aluzinc',
  gaugeLabel: '0.20',
  weightKg: 5000,
  currentWeightKg: 5000,
};

describe('coil expected life', () => {
  it('uses the latest completion correction per job and does not add it', () => {
    const rows = latestJobRows([
      { jobID: 'J1', metersProduced: 10, consumedWeightKg: 40, atISO: '2026-01-01' },
      { jobID: 'J1', metersProduced: 4, consumedWeightKg: 8, note: 'completion correction', atISO: '2026-01-02' },
      { jobID: 'J2', metersProduced: 6, consumedWeightKg: 12, atISO: '2026-01-03' },
    ]);
    expect(rows).toHaveLength(2);
    const life = buildCoilLife(aluzinc, rows, []);
    expect(life.metres).toBe(10);
    expect(life.bookedKg).toBe(20);
    expect(life.rateKgPerM).toBe(1.935);
    expect(life.expectedKg).toBeCloseTo(5000 - 10 * 1.935, 3);
  });

  it('flags HIGH when ERP kg sits above tolerance and LOW when it sits below', () => {
    const jobs = [{ jobID: 'J1', metersProduced: 100, consumedWeightKg: 190 }];
    const high = buildCoilLife({ ...aluzinc, currentWeightKg: 5000 }, jobs, []);
    expect(high.status).toBe('HIGH');
    const low = buildCoilLife({ ...aluzinc, currentWeightKg: 1000 }, jobs, []);
    expect(low.status).toBe('LOW');
    const ok = buildCoilLife(
      { ...aluzinc, currentWeightKg: high.expectedKg },
      jobs,
      []
    );
    expect(ok.status).toBe('OK');
  });

  it('warns only when typed kg is under half or over double the expected', () => {
    const calm = jobKgTypingCheck(2.2, 1, 1.935);
    expect(calm.warn).toBe(false);
    expect(jobKgTypingCheck(0.5, 1, 1.935).warn).toBe(true);
    expect(jobKgTypingCheck(1013, 4, 1.935).warn).toBe(true);
    expect(jobKgTypingCheck(null, 4, 1.935).warn).toBe(false);
  });

  it('requires review at roll finish when the difference is outside tolerance', () => {
    const pass = rollFinishCheck({
      receivedKg: 1000,
      bookedKg: 193.5,
      tailKg: 806.5,
      metres: 100,
      rate: 1.935,
    });
    expect(pass.verdict).toBe('pass');
    expect(pass.difference).toBeCloseTo(0, 5);
    const review = rollFinishCheck({
      receivedKg: 1000,
      bookedKg: 10,
      tailKg: 20,
      metres: 100,
      rate: 1.935,
    });
    expect(review.verdict).toBe('review');
  });

  it('keeps a corrected job on the timeline with a strike', () => {
    const events = buildCoilTimeline({
      coil: { ...aluzinc, receivedAtISO: '2026-01-01' },
      jobRows: [],
      movements: [
        { id: 'a', type: 'PRODUCTION', detail: 'Job J9 consumed 40 kg', jobID: 'J9', atISO: '2026-02-01', createdByName: 'Ada' },
        {
          id: 'b',
          type: 'PRODUCTION',
          detail: 'Job J9 completion correction 8 kg',
          jobID: 'J9',
          atISO: '2026-02-02',
          createdByName: 'Bola',
          reason: 'Wrong kg',
        },
      ],
    });
    const first = events.find((e) => e.id === 'a');
    const second = events.find((e) => e.id === 'b');
    expect(first.superseded).toBe(true);
    expect(second.superseded).toBe(false);
    expect(second.user).toBe('Bola');
    expect(second.reason).toBe('Wrong kg');
  });
});

describe('supplier advance buckets', () => {
  it('splits goods outstanding, unvalued receipts, and true over-payment', () => {
    const split = splitSupplierAdvanceRows([
      { poId: 'PO-1', supplierPaidNgn: 500000, receivedValueNgn: 0, qtyReceived: 0, status: 'Approved' },
      { poId: 'PO-KD-26-0066', supplierPaidNgn: 80000, receivedValueNgn: 0, qtyReceived: 12, receivedUnvalued: true, status: 'Received' },
      { poId: 'PO-3', supplierPaidNgn: 900000, receivedValueNgn: 700000, supplierAdvanceNgn: 200000, qtyReceived: 4000, status: 'Received' },
    ]);
    expect(split.paidNotReceived.map((r) => r.poId)).toEqual(['PO-1']);
    expect(split.receivedNotValued.map((r) => r.poId)).toEqual(['PO-KD-26-0066']);
    expect(split.trueOverpayment.map((r) => r.poId)).toEqual(['PO-3']);
  });
});
