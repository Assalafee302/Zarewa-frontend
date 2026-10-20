import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffShareBatchPanel } from './StaffShareBatchPanel.jsx';

const data = {
  ok: true,
  weekKey: '2026-10-12',
  thresholdNgn: 5000,
  batches: [
    {
      key: 'associated_staff::AS-1',
      partyKind: 'associated_staff',
      partyId: 'AS-1',
      partyName: 'Ali Driver',
      payeeBankName: 'Moniepoint',
      payeeAccountNo: '6012345678',
      readyLines: [{ refundId: 'RF-1', owedNgn: 4000 }, { refundId: 'RF-2', owedNgn: 2500 }],
      waitingLines: [],
      readyNgn: 6500,
      waitingNgn: 0,
      paidThisWeek: null,
    },
    {
      key: 'associated_staff::AS-2',
      partyKind: 'associated_staff',
      partyId: 'AS-2',
      partyName: 'Bala Installer',
      payeeBankName: '',
      payeeAccountNo: '000',
      readyLines: [{ refundId: 'RF-3', owedNgn: 3000 }],
      waitingLines: [],
      readyNgn: 3000,
      waitingNgn: 0,
      paidThisWeek: null,
    },
  ],
};

describe('StaffShareBatchPanel (A7)', () => {
  afterEach(cleanup);
  it('shows one row per staff member with one Pay, or Add payout account when missing', () => {
    render(
      <MemoryRouter>
        <StaffShareBatchPanel data={data} treasuryAccounts={[{ id: 1, name: 'Moniepoint' }]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/week of 12\/10/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Pay batch' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Add payout account' })).toHaveLength(1);
    expect(screen.getByText(/2 shares: RF-1, RF-2/)).toBeTruthy();
  });
});
