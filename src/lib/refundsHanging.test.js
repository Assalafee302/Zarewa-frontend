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
  it('preserves refundSplits so create allocation reaches the API', () => {
    const splits = [
      {
        recipientKind: 'customer',
        recipientCustomerID: 'CUS-CLAIM',
        recipientAssociatedStaffID: '',
        amountNgn: 19525,
        note: 'Claiming staff',
      },
    ];
    const n = normalizeRefund({
      refundID: 'RF-NEW',
      customerID: 'CUS-NOBANK',
      amountNgn: 19525,
      status: 'Pending',
      refundSplits: splits,
      productionAlignmentAcknowledgedCodes: ['x'],
      productionAlignmentOverrideNote: 'ok',
    });
    expect(n.refundSplits).toEqual(splits);
    expect(n.splitDistributions).toEqual(splits);
    expect(n.productionAlignmentAcknowledgedCodes).toEqual(['x']);
    expect(n.productionAlignmentOverrideNote).toBe('ok');
  });

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
    expect(isRefundHanging(normalizeRefund({ refundID: 'RF-3', status: 'Paid', amountNgn: 10_000, paidAtISO: '2026-08-28', paidBy: 'Finance' }))).toBe(
      false
    );
    expect(
      isRefundHanging(
        normalizeRefund({
          refundID: 'RF-9553',
          status: 'Approved',
          amountNgn: 61_200,
          approvedAmountNgn: 61_200,
          paidAmountNgn: 61_200,
          paidAtISO: '',
          paidBy: '',
        })
      )
    ).toBe(true);
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

    const pendingAfterFund = normalizeRefund({
      refundID: 'RF-CREDIT',
      customerID: 'CUS-1',
      status: 'Pending',
      amountNgn: 40_000,
      creditAppliedNgn: 30_000,
      creditAppliedToQuotationRef: 'QT-NEW',
    });
    expect(hangingRefundOpenAmountNgn(pendingAfterFund)).toBe(10_000);

    const byId = hangingRefundIndicatorsByCustomerId(list);
    expect(byId.get('CUS-1')?.totalOpenNgn).toBe(60_000);
    expect(byId.has('CUS-2')).toBe(true);
    expect(byId.has('CUS-9')).toBe(false);
  });

  it('flags unapplied overpayment credit even with no refund request', () => {
    const ledgerEntries = [
      { customerID: 'CUS-3', type: 'OVERPAY_ADVANCE', amountNgn: 25_000 },
      { customerID: 'CUS-3', type: 'OVERPAY_REVERSAL', amountNgn: 5_000 },
      { customerID: 'CUS-4', type: 'OVERPAY_ADVANCE', amountNgn: 10_000 },
      { customerID: 'CUS-4', type: 'REFUND_OVERPAY', amountNgn: 10_000 },
    ];
    const byId = hangingRefundIndicatorsByCustomerId([], ledgerEntries);
    const cus3 = byId.get('CUS-3');
    expect(cus3?.count).toBe(0);
    expect(cus3?.overpayCreditNgn).toBe(20_000);
    expect(cus3?.shortLabel).toMatch(/unapplied overpay credit/i);
    // CUS-4 credit fully refunded — no indicator
    expect(byId.has('CUS-4')).toBe(false);
  });

  it('keeps refund exposure and ledger credit as separate figures', () => {
    const refunds = [
      normalizeRefund({
        refundID: 'RF-X',
        customerID: 'CUS-5',
        status: 'Pending',
        amountNgn: 12_000,
      }),
    ];
    const ledgerEntries = [{ customerID: 'CUS-5', type: 'OVERPAY_ADVANCE', amountNgn: 12_000 }];
    const info = hangingRefundIndicatorsByCustomerId(refunds, ledgerEntries).get('CUS-5');
    expect(info?.count).toBe(1);
    expect(info?.totalOpenNgn).toBe(12_000);
    expect(info?.overpayCreditNgn).toBe(12_000);
    // never summed — pending overpay refund and its ledger credit are the same money
    expect(info?.shortLabel).toBe('Hanging refund');

    const direct = hangingRefundIndicator([], 7_500);
    expect(direct?.overpayCreditNgn).toBe(7_500);
    expect(direct?.totalOpenNgn).toBe(0);
    expect(hangingRefundIndicator([], 0)).toBeNull();
  });
});
