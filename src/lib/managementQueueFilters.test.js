import { describe, expect, it } from 'vitest';
import {
  cuttingListInProductionGate,
  quotationIsOverdueForCollections,
  quotationNeedsManagerClearance,
} from './managementQueueFilters.js';

describe('managementQueueFilters', () => {
  it('requires any payment for manager clearance', () => {
    expect(quotationNeedsManagerClearance({ paidNgn: 100, totalNgn: 1_000_000 })).toBe(true);
    expect(quotationNeedsManagerClearance({ paidNgn: 0, totalNgn: 1_000_000 })).toBe(false);
    expect(quotationNeedsManagerClearance({ paidNgn: 100, managerClearedAtISO: '2026-01-01' })).toBe(false);
  });

  it('excludes effectively fully paid quotes from production gate', () => {
    const total = 1_000_000;
    const paid = 995_000;
    const cl = { status: 'Draft', quotationRef: 'Q1' };
    const q = { id: 'Q1', totalNgn: total, paidNgn: paid };
    expect(cuttingListInProductionGate(cl, q)).toBe(false);
  });

  it('includes sub-70% paid quotes in production gate', () => {
    const cl = { status: 'Draft', quotationRef: 'Q1' };
    const q = { id: 'Q1', totalNgn: 1_000_000, paidNgn: 500_000 };
    expect(cuttingListInProductionGate(cl, q)).toBe(true);
  });

  it('treats 99.5% paid quotes as settled for collections overdue', () => {
    const q = {
      totalNgn: 1_000_000,
      paidNgn: 995_000,
      paymentStatus: 'Unpaid',
      dueDateISO: '2020-01-01',
    };
    expect(quotationIsOverdueForCollections(q, '2026-06-10')).toBe(false);
  });
});
