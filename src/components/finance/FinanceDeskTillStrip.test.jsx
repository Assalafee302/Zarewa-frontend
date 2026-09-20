import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceDeskTillStrip } from './FinanceDeskTillStrip.jsx';

describe('FinanceDeskTillStrip', () => {
  it('renders Cash / POS / Bank from live till truth plus queue tiles', () => {
    render(
      <FinanceDeskTillStrip
        tillTruth={{
          cashNgn: 450000,
          posNgn: 3000000,
          bankNgn: 8000000,
          totalNgn: 11450000,
          lastMovement: {
            cash: { lastPostedAtISO: '2026-09-20T09:00:00', lastAccountName: 'Till', lastAmountNgn: 5000 },
            pos: { lastPostedAtISO: null, lastAccountName: '', lastAmountNgn: 0 },
            bank: { lastPostedAtISO: '2026-09-21T08:00:00', lastAccountName: 'GTB', lastAmountNgn: 20000 },
          },
          unclearedCount: 2,
          unclearedNgn: 120000,
        }}
        pendingReceipts={2}
        pendingReceiptsNgn={120000}
        payouts={3}
        confirmedToday={5}
      />
    );
    expect(screen.getByRole('region', { name: 'Till now' })).toBeTruthy();
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('POS')).toBeTruthy();
    expect(screen.getByText('Bank')).toBeTruthy();
    expect(screen.getByText('To confirm')).toBeTruthy();
    expect(screen.getByText('To pay')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
