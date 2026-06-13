import { describe, expect, it } from 'vitest';
import { buildPoReceiptPreview } from './poReceiptPreview.js';

describe('buildPoReceiptPreview', () => {
  it('flags Received status with zero line receipts', () => {
    const out = buildPoReceiptPreview({
      po: {
        poID: 'PO-KD-26-0027',
        status: 'Received',
        lines: [{ lineKey: 'L1', productID: 'COIL-ALU', qtyOrdered: 5000, qtyReceived: 0 }],
      },
      coilLots: [],
      movements: [],
    });
    expect(out.diagnosis.tone).toBe('warn');
    expect(out.diagnosis.message).toMatch(/zero received/i);
  });

  it('lists coils and explains receivable POs', () => {
    const out = buildPoReceiptPreview({
      po: {
        poID: 'PO-1',
        status: 'In Transit',
        lines: [{ lineKey: 'L1', productID: 'COIL-ALU', qtyOrdered: 1000, qtyReceived: 0 }],
      },
      coilLots: [{ coilNo: 'CL-26-1', poID: 'PO-1', currentWeightKg: 900, currentStatus: 'Available' }],
      movements: [],
    });
    expect(out.receivableInStock).toBe(true);
    expect(out.coils).toHaveLength(1);
    expect(out.diagnosis.message).toMatch(/Stock Management/i);
  });
});
