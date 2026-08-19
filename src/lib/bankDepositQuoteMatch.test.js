import { describe, expect, it } from 'vitest';
import { recommendBankDepositsForQuoteBalances } from './bankDepositQuoteMatch.js';

describe('recommendBankDepositsForQuoteBalances', () => {
  const quotes = [
    {
      id: 'QT-2026-001',
      customer: 'Alhaji Musa',
      customerID: 'CUS-1',
      date: '2026-03-27',
      balance: 1_020,
    },
    {
      id: 'QT-2026-002',
      customer: 'Other Co',
      customerID: 'CUS-2',
      date: '2026-04-01',
      balance: 80_000,
    },
  ];

  it('recommends an exact remaining-amount fit and ignores a deposit that does not fit', () => {
    const matches = recommendBankDepositsForQuoteBalances({
      deposits: [
        {
          id: 'BD-FIT',
          status: 'OPEN',
          amountNgn: 1_020,
          allocatedNgn: 0,
          remainingNgn: 1_020,
          bankDateISO: '2026-08-18',
          description: 'UBA NIP INFLOW Alhaji Musa',
          bankReference: '',
        },
        {
          id: 'BD-BIG',
          status: 'OPEN',
          amountNgn: 500_000,
          allocatedNgn: 0,
          remainingNgn: 500_000,
          bankDateISO: '2026-08-18',
          description: 'Large inflow',
        },
      ],
      quoteRows: quotes,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].depositId).toBe('BD-FIT');
    expect(matches[0].quotationRef).toBe('QT-2026-001');
    expect(matches[0].amountExact).toBe(true);
    expect(matches[0].applyNgn).toBe(1_020);
    expect(matches[0].action).toBe('apply_deposit');
    expect(matches[0].matchHints).toEqual(expect.arrayContaining(['exact amount', 'customer in narration']));
  });

  it('recommends a close amount within ±₦100 / 1%', () => {
    const matches = recommendBankDepositsForQuoteBalances({
      deposits: [
        {
          id: 'BD-CLOSE',
          status: 'OPEN',
          amountNgn: 1_050,
          allocatedNgn: 0,
          remainingNgn: 1_050,
          bankDateISO: '2026-08-18',
        },
      ],
      quoteRows: quotes,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].amountExact).toBe(false);
    expect(matches[0].amountClose).toBe(true);
    expect(matches[0].applyNgn).toBe(1_020);
  });

  it('does not assign the same deposit to two quotes', () => {
    const matches = recommendBankDepositsForQuoteBalances({
      deposits: [
        {
          id: 'BD-ONE',
          status: 'OPEN',
          amountNgn: 80_000,
          allocatedNgn: 0,
          remainingNgn: 80_000,
          bankDateISO: '2026-04-01',
          description: 'QT-2026-002',
        },
      ],
      quoteRows: [
        { id: 'QT-A', customer: 'A', balance: 80_000, date: '2026-04-01' },
        { id: 'QT-B', customer: 'B', balance: 80_000, date: '2026-04-01' },
        { id: 'QT-2026-002', customer: 'Other Co', balance: 80_000, date: '2026-04-01' },
      ],
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].quotationRef).toBe('QT-2026-002');
  });

  it('prefers confirming an already-posted pending receipt instead of posting again', () => {
    const matches = recommendBankDepositsForQuoteBalances({
      deposits: [
        {
          id: 'BD-FIT',
          status: 'OPEN',
          amountNgn: 1_020,
          allocatedNgn: 0,
          remainingNgn: 1_020,
          bankDateISO: '2026-08-18',
        },
      ],
      quoteRows: quotes,
      pendingReceipts: [
        { id: 'RC-9', quotationRef: 'QT-2026-001', amountNgn: 1_020 },
      ],
    });
    expect(matches[0].action).toBe('confirm_receipt');
    expect(matches[0].pendingReceipt.id).toBe('RC-9');
  });
});
