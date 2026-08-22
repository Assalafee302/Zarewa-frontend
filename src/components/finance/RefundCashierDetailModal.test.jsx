import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RefundCashierDetailModal } from './RefundCashierDetailModal.jsx';
import { apiFetch } from '../../lib/apiBase';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      quotations: [
        {
          id: 'QT-KD-26-1237',
          customer: 'Kaduna Sheets',
          totalNgn: 981_070,
          paidNgn: 1_132_400,
          quotationLines: {
            products: [{ name: 'Roofing Sheet', qty: 198.1, unitPrice: 4700, lineTotal: 931_070 }],
          },
        },
      ],
      receipts: [],
      ledgerEntries: [
        { id: 'LE-1', type: 'RECEIPT', quotationRef: 'QT-KD-26-1237', amountNgn: 1_132_400, dateISO: '2026-08-01' },
      ],
      refunds: [
        {
          refundID: 'RF-KD-26-9490',
          quotationRef: 'QT-KD-26-1237',
          status: 'Paid',
          amountNgn: 174_830,
          paidAmountNgn: 174_830,
          reasonCategory: 'Overpayment',
        },
      ],
    },
  }),
}));

const refund = {
  refundID: 'RF-KD-26-9505',
  customerID: 'CUS-KD-26-0655',
  customer: 'Kaduna Sheets',
  quotationRef: 'QT-KD-26-1237',
  status: 'Approved',
  amountNgn: 151_330,
  approvedAmountNgn: 128_300,
  paidAmountNgn: 0,
  creditAppliedNgn: 23_030,
  creditAppliedToQuotationRef: 'QT-KD-26-1282',
  reasonCategory: 'Overpayment',
  calculationLines: [{ category: 'Overpayment', amountNgn: 151_330 }],
  payoutHistory: [],
};

describe('RefundCashierDetailModal', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it('shows quote, applied credit, leftover cash, and other refunds on the same quote', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        receipts: [],
        summary: { quotationCashInNgn: 1_132_400 },
      },
    });

    render(<RefundCashierDetailModal refund={refund} isOpen onClose={() => {}} />);

    expect(screen.getByText('RF-KD-26-9505')).toBeInTheDocument();
    expect(screen.getByText('Kaduna Sheets')).toBeInTheDocument();
    expect(screen.getAllByText(/applied to/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('QT-KD-26-1282').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/QT-KD-26-1237/).length).toBeGreaterThan(0);
    expect(await screen.findByText(/No sales receipts linked/i)).toBeInTheDocument();
    expect(screen.getByText('RF-KD-26-9490')).toBeInTheDocument();
    expect(screen.getByText(/Roofing Sheet/i)).toBeInTheDocument();
    expect(screen.getByText(/No till or bank payout has been posted/i)).toBeInTheDocument();
  });

  it('does not offer till payout when prior overpay refunds already cover the excess', async () => {
    const onPay = vi.fn();
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: { ok: true, receipts: [], summary: { quotationCashInNgn: 1_132_400 } },
    });

    render(<RefundCashierDetailModal refund={refund} isOpen onClose={() => {}} onPay={onPay} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not pay/i);
    expect(screen.queryByRole('button', { name: /payout/i })).not.toBeInTheDocument();
  });
});
