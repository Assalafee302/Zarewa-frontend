import { describe, it, expect } from 'vitest';
import {
  buildMetresBySpec,
  pickStoreHeroes,
  buildRestockClearanceRows,
  STORE_HERO_COUNT,
} from './storeHeroEngine.js';

describe('storeHeroEngine', () => {
  it('ranks specs by metres in quarter and picks top 5 per family', () => {
    const quotations = [
      { quotationRef: 'Q1', materialColor: 'Gray Beige', materialGauge: '0.28' },
      { quotationRef: 'Q2', materialColor: 'Ivory', materialGauge: '0.24' },
    ];
    const jobs = [
      {
        status: 'Completed',
        quotationRef: 'Q1',
        actualMeters: 1200,
        completedAtISO: '2026-07-10',
        materialTypeName: 'Aluzinc',
      },
      {
        status: 'Completed',
        quotationRef: 'Q2',
        actualMeters: 800,
        completedAtISO: '2026-06-15',
        materialTypeName: 'Aluzinc',
      },
      {
        status: 'Completed',
        quotationRef: 'Q1',
        actualMeters: 400,
        completedAtISO: '2026-07-20',
        materialTypeName: 'Aluzinc',
      },
    ];
    const pack = buildMetresBySpec({
      productionJobs: jobs,
      quotations,
      period: 'quarter',
      asOfISO: '2026-07-31',
    });
    expect(pack.rows[0].colour).toBe('Gray Beige');
    expect(pack.rows[0].metres).toBe(1600);
    const { heroes, heroKeys } = pickStoreHeroes(pack, STORE_HERO_COUNT);
    expect(heroes.length).toBeGreaterThanOrEqual(1);
    expect(heroKeys.has(pack.rows[0].key)).toBe(true);
  });

  it('builds restock clearance preferring heroes', () => {
    const heroKeys = new Set(['aluzinc|Gray Beige|0.28']);
    const rows = buildRestockClearanceRows(
      [
        {
          key: 'aluzinc|Soft Brown|0.40',
          colour: 'Soft Brown',
          gauge: '0.40',
          familyLabel: 'Aluzinc',
          family: 'aluzinc',
          belowMin: true,
          shortfallKg: 900,
          availableKg: 100,
          restockMinKg: 700,
        },
        {
          key: 'aluzinc|Gray Beige|0.28',
          colour: 'Gray Beige',
          gauge: '0.28',
          familyLabel: 'Aluzinc',
          family: 'aluzinc',
          belowMin: true,
          shortfallKg: 200,
          availableKg: 500,
          restockMinKg: 700,
        },
      ],
      heroKeys,
      { max: 3 }
    );
    expect(rows[0].restock.colour).toBe('Gray Beige');
    expect(rows[0].action).toBe('restock');
    expect(rows[0].title).toMatch(/hero/i);
  });
});
