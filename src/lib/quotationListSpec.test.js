import { describe, it, expect } from 'vitest';
import { quotationListColour, quotationListGauge } from './quotationListSpec.js';

describe('quotationListSpec', () => {
  it('reads colour and gauge from quotation header fields', () => {
    const q = {
      materialColor: 'Nut Brown',
      materialGauge: '0.40',
      quotationLines: { products: [] },
    };
    expect(quotationListColour(q)).toBe('Nut Brown');
    expect(quotationListGauge(q)).toBe('0.40');
  });

  it('prefers the thickest line gauge when header is thinner', () => {
    const q = {
      materialGauge: '0.32',
      quotationLines: {
        materialGauge: '0.32',
        products: [{ gauge: '0.45' }],
      },
    };
    expect(quotationListGauge(q)).toBe('0.45');
  });
});
