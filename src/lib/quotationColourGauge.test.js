import { describe, expect, it } from 'vitest';
import {
  findQuotationByRef,
  quotationColourGaugeLabel,
  receiptDateLabel,
} from './quotationColourGauge.js';

describe('quotationColourGauge', () => {
  it('joins colour and gauge', () => {
    expect(
      quotationColourGaugeLabel({ materialColor: 'Heritage Blue', materialGauge: '0.45mm' })
    ).toBe('Heritage Blue · 0.45mm');
  });

  it('finds quote by id or quotationID', () => {
    const rows = [{ quotationID: 'QT-9', materialColor: 'White' }];
    expect(findQuotationByRef(rows, 'QT-9')?.materialColor).toBe('White');
  });

  it('reads receipt date', () => {
    expect(receiptDateLabel({ dateISO: '2026-08-18T10:00:00Z' })).toBe('2026-08-18');
  });
});
