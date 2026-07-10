import React from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { FinanceDeskCashierGuide } from './FinanceDeskCashierGuide.jsx';

describe('FinanceDeskCashierGuide', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders start-here guide when not dismissed', () => {
    render(<FinanceDeskCashierGuide />);
    expect(screen.getByTestId('cashier-desk-guide')).toBeTruthy();
    expect(screen.getByText(/Your daily cashier workflow/i)).toBeTruthy();
  });

  it('dismisses guide and persists to localStorage', () => {
    render(<FinanceDeskCashierGuide />);
    const guide = screen.getByTestId('cashier-desk-guide');
    fireEvent.click(within(guide).getByRole('button', { name: /Got it — hide this guide/i }));
    expect(screen.queryByTestId('cashier-desk-guide')).toBeNull();
    expect(window.localStorage.getItem('zarewa.cashierDeskGuide.dismissed')).toBe('1');
  });
});
