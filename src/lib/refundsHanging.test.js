import { describe, it, expect } from 'vitest';
import {
  hangingRefundIndicator,
  hangingRefundIndicatorsByCustomerId,
  hangingRefundOpenAmountNgn,
  hangingRefundsForCustomer,
  isRefundHanging,
  normalizeRefund,
} from './refundsStore.js';

describe('hanging refund indicators', () => {
  it('treats Pending and unpaid Approved as hanging', () => {
    expect(isRefundHanging(normalizeRefund({ refundID: 'RF-1', status: 'Pending', amountNgn: 10_000 }))).toBe(
      true
    );
    expect(
      isRefundHanging(
        normalizeRefund({
          refundID: 'RF-2',
          status: 'Approved',
          amountNgn: 20_000,
          approvedAmountNgn: 20_000,
          paidAmountNgn: 5_000,
        })
      )
    ).toBe(true);
    expect(isRefundHanging(normalizeRefund({ refundID: 'RF-3', status: 'Paid', amountNgn: 10_000 }))).toBe(
      false
    );
    expect(isRefundHanging(normalizeRefund({ refundID: 'RF-4', status: 'Rejected', amountNgn: 10_000 }))).toBe(
      false
    );
  });

  it('summarises open amount and labels for a customer', () => {
    const list = [
      normalizeRefund({
        refundID: 'RF-A',
        customerID: 'CUS-1',
        status: 'Pending',
        amountNgn: 40_000,
        quotationRef: 'QT-1',
      }),
      normalizeRefund({
        refundID: 'RF-B',
        customerID: 'CUS-1',
        status: 'Approved',
        amountNgn: 30_000,
        approvedAmountNgn: 30_000,
        paidAmountNgn: 10_000,
        quotationRef: 'QT-2',
      }),
      normalizeRefund({
        refundID: 'RF-C',
        customerID: 'CUS-2',
        status: 'Pending',
        amountNgn: 5_000,
      }),
    ];
    const hanging = hangingRefundsForCustomer(list, 'CUS-1');
    expect(hanging).toHaveLength(2);
    expect(hangingRefundOpenAmountNgn(hanging[0])).toBe(40_000);
    expect(hangingRefundOpenAmountNgn(hanging[1])).toBe(20_000);
    const info = hangingRefundIndicator(hanging);
    expect(info?.count).toBe(2);
    expect(info?.totalOpenNgn).toBe(60_000);
    expect(info?.shortLabel).toMatch(/hanging refunds/i);
    expect(info?.detailLabel).toContain('RF-A');

    const byId = hangingRefundIndicatorsByCustomerId(list);
    expect(byId.get('CUS-1')?.totalOpenNgn).toBe(60_000);
    expect(byId.has('CUS-2')).toBe(true);
    expect(byId.has('CUS-9')).toBe(false);
  });
});
