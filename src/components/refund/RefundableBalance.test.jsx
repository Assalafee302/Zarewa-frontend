import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefundableBalance } from './RefundableBalance.jsx';

describe('RefundableBalance', () => {
  it('shows the balance and, on tap, the three parts and the system suggestion (QT-KD-26-1777)', () => {
    render(
      <RefundableBalance
        breakdown={{ cashInNgn: 12_000_000, refundsNgn: 1_913_200, creditOutNgn: 29_200 }}
        suggestedNgn={150_000}
        requestedNgn={150_000}
      />
    );
    expect(screen.getByText('₦10,057,600')).toBeTruthy();
    expect(screen.getByText(/₦9,907,600 left after this request/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /how/i }));
    expect(screen.getByText('₦12,000,000')).toBeTruthy();
    expect(screen.getByText('₦1,913,200')).toBeTruthy();
    expect(screen.getByText('₦29,200')).toBeTruthy();
    expect(screen.getByText(/System suggests/)).toBeTruthy();
    expect(screen.getByText('₦150,000')).toBeTruthy();
  });

  it("names the excess when the request is above the balance (owner's example)", () => {
    render(<RefundableBalance cashInNgn={2_100_000} refundsNgn={1_913_200} creditOutNgn={29_200} requestedNgn={160_000} />);
    expect(screen.getByText('₦157,600')).toBeTruthy();
    expect(screen.getByText(/Request ₦160,000 is above the refundable balance by ₦2,400/)).toBeTruthy();
  });
});
