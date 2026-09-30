import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ApproveRejectConfirmBar } from './ApproveRejectConfirmBar.jsx';
import { PaymentRequestApprovalPreview } from './PaymentRequestApprovalPreview.jsx';
import { RegisterSettlementApprovalPreview } from './RegisterSettlementApprovalPreview.jsx';
import { PurchaseOrderApprovalPreview } from './PurchaseOrderApprovalPreview.jsx';

function money(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

describe('ApproveRejectConfirmBar', () => {
  it('states the payout before approve and does not approve until the review box is ticked', () => {
    const onApprove = vi.fn();
    render(
      <ApproveRejectConfirmBar
        asSticky={false}
        restatement="Approve pays out ₦50,000."
        acknowledgeLabel="I have reviewed this withdrawal amount."
        approveLabel="Approve withdrawal"
        rejectLabel="Reject"
        onApprove={onApprove}
        onReject={() => {}}
      />
    );
    expect(screen.getByText(/approve pays out/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /approve withdrawal/i }));
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.getByText(/tick the review box/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /approve withdrawal/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentRequestApprovalPreview', () => {
  it('shows payee, amount, and what approve does', () => {
    render(
      <PaymentRequestApprovalPreview
        requestId="PR-22"
        formatNgn={money}
        row={{
          amount_requested_ngn: 125000,
          description: 'Diesel for generator',
          request_reference: 'EXP-9',
          requested_by_name: 'chidi okafor',
          payee_name: 'NNPC Retail',
          payee_bank_name: 'Access',
          payee_account_no: '0123456789',
        }}
      />
    );
    expect(screen.getByText(/expense payment request/i)).toBeTruthy();
    expect(screen.getByText('PR-22')).toBeTruthy();
    expect(screen.getByText('NNPC Retail')).toBeTruthy();
    expect(screen.getByText(/if you approve/i)).toBeTruthy();
    expect(screen.getByText(/cashier can pay/i)).toBeTruthy();
  });
});

describe('RegisterSettlementApprovalPreview', () => {
  it('explains that approve pays out and reject keeps cash on the register', () => {
    render(
      <RegisterSettlementApprovalPreview
        settlementId="SET-7"
        formatNgn={money}
        row={{
          amountNgn: 80000,
          partyName: 'Mallam Sule',
          registerLineId: 'REG-3',
          requestedByName: 'fatima bello',
          reason: 'Change for market stall',
        }}
      />
    );
    expect(screen.getByText(/payable withdrawal/i)).toBeTruthy();
    expect(screen.getByText('SET-7')).toBeTruthy();
    expect(screen.getByText('Mallam Sule')).toBeTruthy();
    expect(screen.getByText(/keeps the cash on the register/i)).toBeTruthy();
  });
});

describe('PurchaseOrderApprovalPreview', () => {
  it('sends the manager to Procurement instead of approving in the popup', () => {
    render(
      <PurchaseOrderApprovalPreview
        poId="PO-41"
        formatNgn={money}
        row={{ supplier_name: 'Kano Steel', amount_ngn: 2_400_000, status: 'Pending' }}
        auditData={{ ok: false }}
      />
    );
    expect(screen.getByText('PO-41')).toBeTruthy();
    expect(screen.getByText(/procurement desk/i)).toBeTruthy();
  });
});
