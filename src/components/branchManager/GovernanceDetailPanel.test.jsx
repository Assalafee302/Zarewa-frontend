import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GovernanceDetailPanel } from './GovernanceDetailPanel.jsx';

function money(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

describe('GovernanceDetailPanel', () => {
  it('renders dual_control segregation alert with actor breakdown and actions', () => {
    const onOpenRefund = vi.fn();
    const onOpenQuotation = vi.fn();

    render(
      <GovernanceDetailPanel
        item={{
          id: 'dual_control:RF-2026-0099:same_requester_approver',
          refundId: 'RF-2026-0099',
          quotationRef: 'QT-2026-0044',
          amountNgn: 150_000,
          reasons: ['Dual-control segregation', 'Requester = approver'],
          row: {
            kind: 'same_requester_approver',
            refundId: 'RF-2026-0099',
            customerName: 'Alhaji Musa',
            requestedBy: 'John Doe',
            approvedBy: 'John Doe',
            paidBy: '',
            status: 'Approved',
            amountNgn: 150_000,
          },
        }}
        formatNgn={money}
        onOpenRefund={onOpenRefund}
        onOpenQuotation={onOpenQuotation}
      />
    );

    expect(screen.getByText(/Dual-Control Segregation Alert/i)).toBeTruthy();
    expect(screen.getByText(/RF-2026-0099/i)).toBeTruthy();
    expect(screen.getByText(/Alhaji Musa/i)).toBeTruthy();
    expect(screen.getByText(/₦150,000/i)).toBeTruthy();
    expect(screen.getByText(/Self-approval violation/i)).toBeTruthy();

    const openRefundBtn = screen.getByRole('button', { name: /Open refund review/i });
    fireEvent.click(openRefundBtn);
    expect(onOpenRefund).toHaveBeenCalledWith('RF-2026-0099');

    const openQuoteBtn = screen.getByRole('button', { name: /View quotation/i });
    fireEvent.click(openQuoteBtn);
    expect(onOpenQuotation).toHaveBeenCalledWith('QT-2026-0044');
  });

  it('renders payment_gate breach with financial stats and dispatch hold warning', () => {
    const onOpenQuotation = vi.fn();
    const onOpenProductionQc = vi.fn();

    render(
      <GovernanceDetailPanel
        item={{
          id: 'payment_gate:JOB-9921',
          jobId: 'JOB-9921',
          quotationRef: 'QT-8800',
          reasons: ['Payment gate breach on completed production', 'Only 35% paid (70% required)'],
          row: {
            jobId: 'JOB-9921',
            quotationRef: 'QT-8800',
            customerName: 'Grace Bature',
            productName: '0.45mm Corrugated Zinc',
            totalNgn: 1_000_000,
            paidNgn: 350_000,
            outstandingNgn: 650_000,
            paidPct: 35,
            actualMeters: 850,
          },
        }}
        formatNgn={money}
        onOpenQuotation={onOpenQuotation}
        onOpenProductionQc={onOpenProductionQc}
      />
    );

    expect(screen.getByText(/Payment Gate Exception/i)).toBeTruthy();
    expect(screen.getByText(/Quotation QT-8800/i)).toBeTruthy();
    expect(screen.getByText(/Grace Bature/i)).toBeTruthy();
    expect(screen.getAllByText(/₦1,000,000/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₦650,000/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Dispatch Hold: Do not release finished goods/i)).toBeTruthy();

    const openQuoteBtn = screen.getByRole('button', { name: /Open quotation in Sales/i });
    fireEvent.click(openQuoteBtn);
    expect(onOpenQuotation).toHaveBeenCalledWith('QT-8800');

    const openQcBtn = screen.getByRole('button', { name: /Inspect production QC/i });
    fireEvent.click(openQcBtn);
    expect(onOpenProductionQc).toHaveBeenCalledWith('JOB-9921');
  });

  it('renders missing_bm governance alert with navigation action', () => {
    const navigate = vi.fn();
    const onClose = vi.fn();

    render(
      <GovernanceDetailPanel
        item={{
          id: 'missing_bm:BR-KD',
          branchId: 'BR-KD',
          branchName: 'Kaduna',
          reasons: ['Branch has no active Branch Manager'],
          row: {
            branchId: 'BR-KD',
            branchName: 'Kaduna',
            integrityKind: 'missing_branch_manager',
          },
        }}
        formatNgn={money}
        navigate={navigate}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/No Branch Manager — Kaduna/i)).toBeTruthy();
    expect(screen.getByText(/Branch approvals stalled/i)).toBeTruthy();
    expect(screen.getByText(/Customer complaints unowned/i)).toBeTruthy();

    const teamBtn = screen.getByRole('button', { name: /Open Team & access settings/i });
    fireEvent.click(teamBtn);
    expect(navigate).toHaveBeenCalledWith('/settings/team');
  });
});
