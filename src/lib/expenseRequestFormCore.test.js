import { describe, expect, it } from 'vitest';
import {
  findNearDuplicatePaymentRequest,
  normalizeExpensePayeeKey,
} from './expenseRequestFormCore.js';

describe('expenseRequestFormCore near-duplicate', () => {
  it('normalizes payee keys', () => {
    expect(normalizeExpensePayeeKey('  Acme   Parts ')).toBe('acme parts');
  });

  it('finds same payee + amount + day', () => {
    const hit = findNearDuplicatePaymentRequest({
      paymentRequests: [
        {
          request_id: 'PR-1',
          payee_name: 'Acme Parts',
          amount_requested_ngn: 25000,
          request_date: '2026-07-29',
          status: 'pending_approval',
        },
      ],
      payeeName: 'acme  parts',
      amountNgn: 25000,
      requestDate: '2026-07-29',
    });
    expect(hit?.request_id).toBe('PR-1');
  });

  it('ignores rejected rows and different days', () => {
    expect(
      findNearDuplicatePaymentRequest({
        paymentRequests: [
          {
            request_id: 'PR-2',
            payeeName: 'Acme Parts',
            amountRequestedNgn: 25000,
            requestDate: '2026-07-29',
            status: 'rejected',
          },
          {
            request_id: 'PR-3',
            payeeName: 'Acme Parts',
            amountRequestedNgn: 25000,
            requestDate: '2026-07-28',
            status: 'approved',
          },
        ],
        payeeName: 'Acme Parts',
        amountNgn: 25000,
        requestDate: '2026-07-29',
      })
    ).toBeNull();
  });
});
