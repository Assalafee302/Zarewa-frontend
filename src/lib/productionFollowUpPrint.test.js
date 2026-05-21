import { describe, expect, it } from 'vitest';
import { enrichProductionFollowUpRows } from './productionFollowUpPrint.js';

describe('enrichProductionFollowUpRows', () => {
  it('pulls project, colour, and gauge from linked quotation', () => {
    const rows = [
      {
        id: 'CL-100',
        cuttingListId: 'CL-100',
        quotationRef: 'Q-42',
        customer: 'Acme Ltd',
        lineStatusLabel: 'Pushed',
        status: 'Planned',
        needsCoil: true,
        coilLabel: 'Coils: none (allocate before start)',
      },
    ];
    const quotations = [
      {
        id: 'Q-42',
        projectName: 'Warehouse roof',
        materialColor: 'Heritage Blue',
        materialGauge: '0.45mm',
      },
    ];
    const out = enrichProductionFollowUpRows(rows, quotations);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      quotationRef: 'Q-42',
      cuttingListId: 'CL-100',
      customer: 'Acme Ltd',
      projectName: 'Warehouse roof',
      colour: 'Heritage Blue',
      gauge: '0.45mm',
      lineStatus: 'Pushed',
      jobStatus: 'Planned',
    });
    expect(out[0].followUp).toContain('No coil allocated');
  });
});
