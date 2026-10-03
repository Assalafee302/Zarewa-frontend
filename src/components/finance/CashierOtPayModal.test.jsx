import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CashierOtPayModal } from './CashierOtPayModal.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      treasuryMovements: [],
      treasuryAccounts: [
        { id: '1', name: 'Main Cash Till', type: 'Till', balance: 500_000 },
      ],
    },
    session: { user: { displayName: 'Finance Officer' } },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

const mockOtRequest = {
  ok: true,
  request: {
    id: 'OT-2026-0042',
    dayIso: '2026-10-02',
    workType: 'Coil Slitting & Corrugation',
    quotationRef: 'Q-2026-99',
    poId: '',
    reason: 'Urgent weekend batch for Kano roofing project',
    createdByName: 'Musa Ibrahim',
    approvedByName: 'Ibrahim Bello (Factory Mgr)',
    totalPayableNgn: 45_000,
    branchId: 'KD',
    status: 'approved_by_bm',
  },
  staffLines: [
    { id: 's1', staffUserId: 'u1', displayName: 'Aliyu Garba', roleLabel: 'Machine Operator', startTime: '18:00', endTime: '22:00' },
    { id: 's2', staffUserId: 'u2', displayName: 'Sani Umar', roleLabel: 'Assistant Operator', startTime: '18:00', endTime: '22:00' },
  ],
  paymentLine: {
    category: 'Night Shift',
    quantity: 4,
    rateApproved: 11_250,
    amountNgn: 45_000,
    remarks: 'Approved per standard overtime rate card',
  },
  workDetails: {
    workDone: 'Corrugation of 45 bundles',
    materialType: 'Aluzinc 0.45mm',
    quantity: 45,
    quantityUnit: 'bundles',
  },
};

vi.mock('../../lib/otRequestsApi', () => ({
  getOtRequest: vi.fn().mockImplementation(() => Promise.resolve({ ok: true, data: mockOtRequest })),
  payOtRequest: vi.fn().mockImplementation(() => Promise.resolve({ ok: true, data: { ok: true, request: { totalPayableNgn: 45_000 } } })),
}));

describe('CashierOtPayModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders OT payout modal with hero card, balance due, and staff preview', async () => {
    render(
      <CashierOtPayModal
        requestId="OT-2026-0042"
        open={true}
        onClose={vi.fn()}
        onPaid={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('OT-2026-0042')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Total Overtime Payable Due/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aliyu Garba').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sani Umar').length).toBeGreaterThan(0);
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.getByText(/Overtime Details & Staff/i)).toBeInTheDocument();
  });

  it('switches between Disbursement and Overtime Details tabs', async () => {
    render(
      <CashierOtPayModal
        requestId="OT-2026-0042"
        open={true}
        onClose={vi.fn()}
        onPaid={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('OT-2026-0042')).toBeInTheDocument();
    });

    const detailsTab = screen.getByText(/Overtime Details & Staff/i);
    fireEvent.click(detailsTab);

    expect(screen.getByText('Overtime Reason / Description')).toBeInTheDocument();
    expect(screen.getByText('Urgent weekend batch for Kano roofing project')).toBeInTheDocument();
    expect(screen.getByText('Payment Rate & Category')).toBeInTheDocument();
    expect(screen.getByText('Night Shift')).toBeInTheDocument();
    expect(screen.getByText('Corrugation of 45 bundles')).toBeInTheDocument();
  });
});
