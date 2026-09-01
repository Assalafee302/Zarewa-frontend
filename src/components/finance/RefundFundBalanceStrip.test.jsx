import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RefundFundBalanceStrip } from './RefundFundBalanceStrip.jsx';

describe('RefundFundBalanceStrip', () => {
  it('shows original, used on another quotation, and all that can still be paid out', () => {
    render(
      <RefundFundBalanceStrip
        amountNgn={4_144_236}
        creditAppliedNgn={3_200_000}
        availableNgn={944_236}
        usedOn="quotation"
        leftoverHint="payout"
      />
    );
    expect(screen.getByText(/already used/i)).toBeInTheDocument();
    expect(screen.getByText(/on another quotation/i)).toBeInTheDocument();
    expect(screen.getByText(/is all that can still be paid out/i)).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByText('Can pay')).toBeInTheDocument();
  });

  it('keeps receipt leftover copy when applying a named refund fund', () => {
    render(
      <RefundFundBalanceStrip
        amountNgn={150_000}
        creditAppliedNgn={50_000}
        availableNgn={100_000}
        creditAppliedToQuotationRef="QT-NEW"
      />
    );
    expect(screen.getByText(/on QT-NEW/i)).toBeInTheDocument();
    expect(screen.getByText(/left to apply or pay/i)).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });
});
