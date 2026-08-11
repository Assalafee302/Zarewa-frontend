import { describe, expect, it } from 'vitest';
import {
  cuttingListByQuotationRefMap,
  enrichReceiptsWithCuttingListMeta,
  normSalesQuotationRefKey,
  receiptCuttingListLinkMeta,
  receiptLacksCuttingList,
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

  it('flags receipts that lack a cutting list', () => {
    expect(receiptLacksCuttingList('linked')).toBe(false);
    expect(receiptLacksCuttingList('none')).toBe(true);
    expect(receiptLacksCuttingList('no_quote')).toBe(true);
    expect(receiptLacksCuttingList({ kind: 'none' })).toBe(true);
  });

  it('enriches receipt rows with cutting-list meta', () => {
    const rows = enrichReceiptsWithCuttingListMeta(
      [
        { id: 'RC-1', quotationRef: 'QT-2026-001' },
        { id: 'RC-2', quotationRef: 'QT-2026-002' },
      ],
      [{ id: 'CL-26-001', quotationRef: 'QT-2026-001', status: 'Draft' }]
    );
    expect(rows[0]._cuttingListLinkKind).toBe('linked');
    expect(rows[0]._cuttingListId).toBe('CL-26-001');
    expect(rows[1]._cuttingListLinkKind).toBe('none');
    expect(receiptLacksCuttingList(rows[1])).toBe(true);
  });
});
