import { describe, expect, it } from 'vitest';
import {
  normalizeProcurementStatus,
  purchaseOrderIsPendingApproval,
  purchaseOrderLineTotalNgn,
} from './procurementStatus.js';

describe('procurementStatus', () => {
  it('normalizes pending PO statuses to requested', () => {
    expect(normalizeProcurementStatus('draft')).toBe('requested');
    expect(normalizeProcurementStatus('Pending Approval')).toBe('requested');
    expect(normalizeProcurementStatus('approved')).toBe('approved');
  });

  it('detects POs awaiting approval', () => {
    expect(purchaseOrderIsPendingApproval({ status: 'draft' })).toBe(true);
    expect(purchaseOrderIsPendingApproval({ status: 'approved' })).toBe(false);
  });

  it('sums line totals from mixed field names', () => {
    const total = purchaseOrderLineTotalNgn({
      lines: [
        { qtyOrdered: 2, unitPriceNgn: 1000 },
        { qty: 3, unit_price_ngn: 500 },
      ],
    });
    expect(total).toBe(3500);
  });
});
