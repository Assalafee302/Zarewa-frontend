import { describe, it, expect } from 'vitest';
import { buildCoilStatementPayload, coilStatementMovementTitle } from './coilStatementPrint.js';

describe('coilStatementMovementTitle', () => {
  it('maps known movement types', () => {
    expect(coilStatementMovementTitle({ type: 'SCRAP', detail: '' })).toBe('Scrap posted');
    expect(coilStatementMovementTitle({ type: 'X', detail: 'Roll finished — tail' })).toBe('Roll finished');
    expect(coilStatementMovementTitle({ type: 'RECEIPT', detail: 'GRN' })).toBe('Store receipt');
  });
});

describe('buildCoilStatementPayload', () => {
  it('returns null without coil', () => {
    expect(buildCoilStatementPayload({ coil: null, balances: {} })).toBeNull();
  });

  it('builds master, balances, and production rows', () => {
    const statement = buildCoilStatementPayload({
      coil: {
        coilNo: 'COIL-99',
        productID: 'ALU-045',
        colour: 'Blue',
        gaugeLabel: '0.45',
        materialTypeName: 'Aluminium',
        supplierName: 'Acme',
        poID: 'PO-1',
        currentStatus: 'In stock',
        location: 'Yard A',
        receivedAtISO: '2026-03-15T10:00:00Z',
        supplierConversionKgPerM: 2.15,
      },
      balances: {
        receivedKg: 1000,
        kgUsed: 200,
        productionUsedKg: 180,
        incidentScrapKg: 20,
        onHandKg: 800,
        reservedKg: 50,
        freeKg: 750,
      },
      jobRows: [
        {
          jobID: 'PRO-1',
          cuttingListId: 'CL-1',
          quotationRef: 'Q-9',
          customer: 'Bello Homes',
          jobStatus: 'Completed',
          openingWeightKg: 1000,
          closingWeightKg: 820,
          consumedWeightKg: 180,
          metersProduced: 85,
          allocatedAtISO: '2026-03-20T08:00:00Z',
          actualConv: 2.12,
          alertState: 'Within band',
        },
      ],
      conversionChecks: [
        {
          cuttingListId: 'CL-1',
          atISO: '2026-03-20T09:00:00Z',
          actualConversionKgPerM: 2.12,
          standardConversionKgPerM: 2.1,
          supplierConversionKgPerM: 2.15,
          alertState: 'Within band',
        },
      ],
      movements: [{ type: 'PRODUCTION', detail: 'Consumed on CL-1', atISO: '2026-03-20T08:30:00Z', ref: 'CL-1' }],
      productionTotals: { jobsConsumedKgSum: 180, gapKg: -20 },
      purchaseConversion: 2.15,
      avgActualConversion: 2.12,
      avgStandardConversion: 2.1,
    });

    expect(statement.coilNo).toBe('COIL-99');
    expect(statement.colour).toBe('Blue');
    expect(statement.balanceLabels.received).toContain('1,000');
    expect(statement.productionRows).toHaveLength(1);
    expect(statement.productionRows[0].cuttingListId).toBe('CL-1');
    expect(statement.productionRows[0].customer).toBe('Bello Homes');
    expect(statement.productionRows[0].kgUsed).toBe(180);
    expect(statement.totals.totalMeters).toBe(85);
    expect(statement.conversionRows).toHaveLength(1);
    expect(statement.movementRows[0].title).toBe('Production consumed');
  });
});
