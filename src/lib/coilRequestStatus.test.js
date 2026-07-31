import { describe, it, expect } from 'vitest';
import {
  coilRequestIsApproved,
  coilRequestIsPending,
  coilRequestQtyUnit,
  coilRequestStatusLabel,
  formatCoilRequestQty,
  STORE_STOCK_BUY_PATH,
} from './coilRequestStatus.js';

describe('coilRequestStatus', () => {
  it('treats pending as awaiting BM', () => {
    expect(coilRequestIsPending('pending')).toBe(true);
    expect(coilRequestIsApproved('pending')).toBe(false);
    expect(coilRequestStatusLabel('pending')).toMatch(/BM/i);
  });

  it('treats approved and legacy acknowledged as buy-ready', () => {
    expect(coilRequestIsApproved('approved')).toBe(true);
    expect(coilRequestIsApproved('acknowledged')).toBe(true);
    expect(coilRequestStatusLabel('approved')).toMatch(/buy-ready/i);
  });

  it('infers metres for stone lines and formats qty', () => {
    expect(coilRequestQtyUnit({ materialType: 'Stone · Milano', requestedKg: 300 })).toBe('m');
    expect(coilRequestQtyUnit({ family: 'stone' })).toBe('m');
    expect(coilRequestQtyUnit({ materialType: 'Aluzinc' })).toBe('kg');
    expect(coilRequestQtyUnit({ unit: 'm', materialType: 'Aluzinc' })).toBe('m');
    expect(coilRequestQtyUnit({ unit: 'kg', materialType: 'Stone · Milano' })).toBe('kg');
    expect(formatCoilRequestQty(300, 'm')).toBe('300 m');
  });

  it('exports a stable buy-path string', () => {
    expect(STORE_STOCK_BUY_PATH).toMatch(/BM approves/i);
  });
});
