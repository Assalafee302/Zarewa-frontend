import { describe, expect, it } from 'vitest';
import {
  cuttingListByQuotationRefMap,
  normSalesQuotationRefKey,
  receiptCuttingListLinkMeta,
} from './salesReceiptsList.js';

describe('receipt cutting list link', () => {
  it('matches quotation refs with dash normalization', () => {
    expect(normSalesQuotationRefKey('QT–2026-001')).toBe(normSalesQuotationRefKey('QT-2026-001'));
  });

  it('reports linked cutting list on quote', () => {
    const map = cuttingListByQuotationRefMap([
      { id: 'CL-26-001', quotationRef: 'QT-2026-001', status: 'Draft' },
    ]);
    const meta = receiptCuttingListLinkMeta({ quotationRef: 'QT-2026-001' }, map);
    expect(meta.kind).toBe('linked');
    expect(meta.cuttingListId).toBe('CL-26-001');
  });

  it('reports no cutting list when quote has payments only', () => {
    const map = cuttingListByQuotationRefMap([]);
    const meta = receiptCuttingListLinkMeta({ quotationRef: 'QT-2026-002' }, map);
    expect(meta.kind).toBe('none');
    expect(meta.label).toBe('No cutting list');
  });

  it('reports no quote when payment is unlinked', () => {
    const meta = receiptCuttingListLinkMeta({ quotationRef: '' }, new Map());
    expect(meta.kind).toBe('no_quote');
  });
});
