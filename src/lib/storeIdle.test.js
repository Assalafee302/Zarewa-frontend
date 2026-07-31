import { describe, it, expect } from 'vitest';
import {
  buildLastUsedByCoilNo,
  buildIdleClearanceRows,
  compareCoilsFifo,
  idleBandForLastUsed,
  resolveLotLastUsedISO,
  summarizeCriticalIdleForPromotion,
  IDLE_WARN_DAYS,
  IDLE_CRITICAL_DAYS,
} from './storeIdle.js';

describe('storeIdle', () => {
  it('bands warn at 60 and critical at 90', () => {
    expect(idleBandForLastUsed('2026-05-01', '2026-07-01')).toBe('warn'); // 61d
    expect(idleBandForLastUsed('2026-04-01', '2026-07-01')).toBe('critical');
    expect(idleBandForLastUsed('2026-06-20', '2026-07-01')).toBe('ok');
  });

  it('builds last-used from consumption movements', () => {
    const map = buildLastUsedByCoilNo([
      { type: 'STORE_GRN', coilNo: 'CL-1', atISO: '2026-01-01' },
      { type: 'COIL_CONSUMPTION', coilNo: 'CL-1', atISO: '2026-03-01' },
      { type: 'COIL_CONSUMPTION', ref: 'CL-1', atISO: '2026-04-15' },
    ]);
    expect(map.get('CL-1')).toBe('2026-04-15');
  });

  it('falls back to receivedAt when never used', () => {
    const map = buildLastUsedByCoilNo([]);
    expect(resolveLotLastUsedISO({ coilNo: 'X', receivedAtISO: '2026-02-10' }, map)).toBe('2026-02-10');
  });

  it('FIFO sorts oldest received first', () => {
    const rows = [
      { coilNo: 'B', receivedAtISO: '2026-06-01' },
      { coilNo: 'A', receivedAtISO: '2026-01-01' },
    ].sort(compareCoilsFifo);
    expect(rows[0].coilNo).toBe('A');
  });

  it('builds at most 3 idle clearance rows, critical first', () => {
    const asOf = '2026-07-31';
    const lots = [
      {
        coilNo: 'OLD',
        colour: 'Soft Brown',
        gaugeLabel: '0.40',
        materialTypeName: 'Aluzinc',
        currentWeightKg: 800,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-01-01',
      },
      {
        coilNo: 'MID',
        colour: 'Gray Beige',
        gaugeLabel: '0.28',
        currentWeightKg: 400,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-05-01',
      },
      {
        coilNo: 'NEW',
        colour: 'Ivory',
        gaugeLabel: '0.24',
        currentWeightKg: 500,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-07-01',
      },
      {
        coilNo: 'EXTRA',
        colour: 'Red',
        gaugeLabel: '0.32',
        currentWeightKg: 300,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-02-01',
      },
    ];
    const map = buildLastUsedByCoilNo([]);
    const rows = buildIdleClearanceRows(lots, map, { asOfISO: asOf, max: 3 });
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows.every((r) => r.kind === 'idle')).toBe(true);
    expect(rows[0].refId).toBe('OLD');
    expect(IDLE_WARN_DAYS).toBe(60);
    expect(IDLE_CRITICAL_DAYS).toBe(90);
  });

  it('summarizes critical idle for BM/Sales promotion', () => {
    const asOf = '2026-07-31';
    const lots = [
      {
        coilNo: 'OLD',
        colour: 'Soft Brown',
        gaugeLabel: '0.40',
        currentWeightKg: 800,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-01-01',
      },
      {
        coilNo: 'FRESH',
        colour: 'Ivory',
        gaugeLabel: '0.24',
        currentWeightKg: 500,
        qtyReserved: 0,
        currentStatus: 'Available',
        receivedAtISO: '2026-07-01',
      },
    ];
    const promo = summarizeCriticalIdleForPromotion(lots, buildLastUsedByCoilNo([]), {
      asOfISO: asOf,
      maxSamples: 2,
    });
    expect(promo.count).toBe(1);
    expect(promo.samples[0].coilNo).toBe('OLD');
    expect(promo.thresholdDays).toBe(IDLE_CRITICAL_DAYS);
    expect(promo.totalFreeKg).toBe(800);
  });
});
