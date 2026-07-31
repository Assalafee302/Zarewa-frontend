import { describe, it, expect } from 'vitest';
import {
  buildStoneSpecBoardRows,
  buildTransitMByStoneSpec,
  filterStoneSpecBoardRows,
  inferStoneDesign,
  stoneSpecKey,
} from './storeStoneSpecAggregate.js';
import {
  buildMetresBySpec,
  pickStoreHeroes,
  buildStoneRestockClearanceRows,
} from './storeHeroEngine.js';

describe('storeStoneSpecAggregate', () => {
  const master = { colours: [{ name: 'Black', abbreviation: 'BK', active: true }] };

  it('infers design from attrs and SKU', () => {
    expect(
      inferStoneDesign({
        productID: 'STONE-x',
        dashboardAttrs: { stoneDesign: 'Milano' },
      })
    ).toBe('Milano');
    expect(inferStoneDesign({ productID: 'STONE-shingle-red-0.40mm' })).toBe('Shingle');
  });

  it('aggregates Design × Colour × Gauge free metres vs min', () => {
    const rows = buildStoneSpecBoardRows(
      [
        {
          productID: 'STONE-milano-black-0.40mm',
          name: 'Stone coated Milano / Black / 0.40mm',
          stockLevel: 200,
          unit: 'm',
          dashboardAttrs: {
            gauge: '0.40mm',
            colour: 'Black',
            materialType: 'Stone coated',
            inventoryModel: 'stone_meter',
            stoneDesign: 'Milano',
          },
        },
      ],
      master,
      { restockMinM: 400 }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe(stoneSpecKey('Milano', 'Black', '0.40'));
    expect(rows[0].freeM).toBe(200);
    expect(rows[0].belowMin).toBe(true);
    expect(rows[0].shortfallM).toBe(200);
  });

  it('counts in-transit metres toward cover', () => {
    const transit = buildTransitMByStoneSpec(
      [
        {
          poID: 'PO-S',
          lines: [
            {
              productID: 'STONE-milano-black-0.40mm',
              productName: 'Stone Milano',
              color: 'Black',
              gauge: '0.40',
              designLabel: 'Milano',
              qtyOrdered: 300,
              qtyReceived: 0,
            },
          ],
        },
      ],
      master
    );
    const rows = buildStoneSpecBoardRows(
      [
        {
          productID: 'STONE-milano-black-0.40mm',
          stockLevel: 150,
          unit: 'm',
          dashboardAttrs: {
            gauge: '0.40',
            colour: 'Black',
            inventoryModel: 'stone_meter',
            stoneDesign: 'Milano',
          },
        },
      ],
      master,
      { restockMinM: 400, transitBySpec: transit }
    );
    expect(rows[0].inTransitM).toBe(300);
    expect(rows[0].availableM).toBe(450);
    expect(rows[0].belowMin).toBe(false);
  });

  it('filters below_min and query', () => {
    const rows = buildStoneSpecBoardRows(
      [
        {
          productID: 'STONE-milano-black-0.40mm',
          stockLevel: 50,
          dashboardAttrs: {
            gauge: '0.40',
            colour: 'Black',
            inventoryModel: 'stone_meter',
            stoneDesign: 'Milano',
          },
        },
        {
          productID: 'STONE-roman-ivory-0.45mm',
          stockLevel: 900,
          dashboardAttrs: {
            gauge: '0.45',
            colour: 'Ivory',
            inventoryModel: 'stone_meter',
            stoneDesign: 'Roman',
          },
        },
      ],
      null,
      { restockMinM: 400 }
    );
    expect(filterStoneSpecBoardRows(rows, { filter: 'below_min' })).toHaveLength(1);
    expect(filterStoneSpecBoardRows(rows, { query: 'roman' })[0].design).toBe('Roman');
  });
});

describe('stone heroes + restock clearance', () => {
  it('picks stone heroes by metres', () => {
    const pack = buildMetresBySpec({
      familyScope: 'stone',
      period: 'quarter',
      asOfISO: '2026-07-31',
      productionJobs: [
        {
          status: 'Completed',
          actualMeters: 1200,
          completedAtISO: '2026-06-01',
          materialTypeName: 'Stone coated',
          colour: 'Black',
          gaugeLabel: '0.40',
          stoneDesign: 'Milano',
          productID: 'STONE-milano-black-0.40mm',
        },
        {
          status: 'Completed',
          actualMeters: 400,
          completedAtISO: '2026-06-15',
          materialTypeName: 'Stone coated',
          colour: 'Ivory',
          gaugeLabel: '0.45',
          stoneDesign: 'Roman',
        },
      ],
    });
    const { heroes, heroKeys } = pickStoreHeroes(pack, 5, { families: ['stone'] });
    expect(heroes[0].design).toBe('Milano');
    expect(heroKeys.has(stoneSpecKey('Milano', 'Black', '0.40'))).toBe(true);
  });

  it('builds stone restock clearance with metre shortfall', () => {
    const specs = buildStoneSpecBoardRows(
      [
        {
          productID: 'STONE-milano-black-0.40mm',
          stockLevel: 100,
          dashboardAttrs: {
            gauge: '0.40',
            colour: 'Black',
            inventoryModel: 'stone_meter',
            stoneDesign: 'Milano',
          },
        },
      ],
      null,
      { restockMinM: 400 }
    );
    const rows = buildStoneRestockClearanceRows(specs, new Set([specs[0].key]), { max: 3 });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toMatch(/hero/i);
    expect(rows[0].restock.unit).toBe('m');
    expect(rows[0].restock.requestedKg).toBe(300);
  });
});
