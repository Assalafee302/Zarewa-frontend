import { describe, it, expect } from 'vitest';
import {
  buildCoilSpecBoardRows,
  buildTransitKgBySpec,
  filterCoilSpecBoardRows,
  summarizeCoilSpecBoard,
  DEFAULT_COIL_RESTOCK_MIN_KG,
} from './storeSpecAggregate.js';

describe('storeSpecAggregate', () => {
  const master = { colours: [{ name: 'Gray Beige', abbreviation: 'GB', active: true }] };

  it('aggregates free vs reserved by colour × gauge × family', () => {
    const rows = buildCoilSpecBoardRows(
      [
        {
          coilNo: 'A',
          colour: 'GB',
          gaugeLabel: '0.28',
          materialTypeName: 'Aluzinc',
          currentWeightKg: 500,
          qtyReserved: 100,
          currentStatus: 'Available',
          receivedAtISO: '2026-01-01',
        },
        {
          coilNo: 'B',
          colour: 'Gray Beige',
          gaugeLabel: '0.28mm',
          materialTypeName: 'Aluzinc',
          currentWeightKg: 200,
          qtyReserved: 0,
          currentStatus: 'Available',
          receivedAtISO: '2026-02-01',
        },
      ],
      master,
      { restockMinKg: 700 }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].colour).toBe('Gray Beige');
    expect(rows[0].gauge).toBe('0.28');
    expect(rows[0].onHandKg).toBe(700);
    expect(rows[0].reservedKg).toBe(100);
    expect(rows[0].freeKg).toBe(600);
    expect(rows[0].lotCount).toBe(2);
    expect(rows[0].lots[0].coilNo).toBe('A');
    expect(rows[0].belowMin).toBe(true);
    expect(rows[0].shortfallKg).toBe(100);
  });

  it('marks thin lots under 85 kg', () => {
    const rows = buildCoilSpecBoardRows([
      {
        coilNo: 'T',
        colour: 'Ivory',
        gaugeLabel: '0.24',
        materialTypeName: 'Aluzinc',
        currentWeightKg: 40,
        qtyReserved: 0,
        currentStatus: 'Available',
      },
    ]);
    expect(rows[0].thinLotCount).toBe(1);
    expect(rows[0].lots[0].thin).toBe(true);
  });

  it('adds in-transit into available vs min', () => {
    const transit = buildTransitKgBySpec(
      [
        {
          poID: 'PO-1',
          lines: [{ color: 'Gray Beige', gauge: '0.28', qtyOrdered: 500, qtyReceived: 0, productID: 'PRD-102' }],
        },
      ],
      master
    );
    const rows = buildCoilSpecBoardRows(
      [
        {
          coilNo: 'C',
          colour: 'Gray Beige',
          gaugeLabel: '0.28',
          materialTypeName: 'Aluzinc',
          currentWeightKg: 300,
          qtyReserved: 0,
          currentStatus: 'Available',
        },
      ],
      master,
      { restockMinKg: 700, transitBySpec: transit }
    );
    expect(rows[0].inTransitKg).toBe(500);
    expect(rows[0].availableKg).toBe(800);
    expect(rows[0].belowMin).toBe(false);
  });

  it('filters by query and below_min', () => {
    const rows = buildCoilSpecBoardRows(
      [
        {
          coilNo: '1',
          colour: 'Gray Beige',
          gaugeLabel: '0.28',
          materialTypeName: 'Aluzinc',
          currentWeightKg: 100,
          qtyReserved: 0,
          currentStatus: 'Available',
        },
        {
          coilNo: '2',
          colour: 'Soft Brown',
          gaugeLabel: '0.40',
          materialTypeName: 'Aluminium',
          currentWeightKg: 2000,
          qtyReserved: 0,
          currentStatus: 'Available',
        },
      ],
      null,
      { restockMinKg: DEFAULT_COIL_RESTOCK_MIN_KG }
    );
    const filtered = filterCoilSpecBoardRows(rows, { query: '0.28 gray', filter: 'below_min' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].colour).toBe('Gray Beige');
    const summary = summarizeCoilSpecBoard(rows);
    expect(summary.specCount).toBe(2);
    expect(summary.belowMinCount).toBeGreaterThanOrEqual(1);
  });

  it('applies per-spec restock min override', () => {
    const rows = buildCoilSpecBoardRows(
      [
        {
          coilNo: '1',
          colour: 'Gray Beige',
          gaugeLabel: '0.28',
          materialTypeName: 'Aluzinc',
          currentWeightKg: 600,
          qtyReserved: 0,
          currentStatus: 'Available',
        },
      ],
      master,
      {
        restockMinKg: 700,
        specMinOverrides: [{ family: 'aluzinc', colour: 'Gray Beige', gauge: '0.28', minKg: 500 }],
      }
    );
    expect(rows[0].restockMinKg).toBe(500);
    expect(rows[0].hasSpecMinOverride).toBe(true);
    expect(rows[0].belowMin).toBe(false);
  });
});
