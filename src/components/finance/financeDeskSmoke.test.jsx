import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceKpiCard } from './FinanceKpiCard';
import { FinanceEmptyState } from './FinanceEmptyState';
import { CreditExceptionStatusChip } from './CreditExceptionStatusChip';
import { FinanceTabs } from './FinanceTabs';

describe('finance desk components', () => {
  it('FinanceKpiCard renders label and value', () => {
    render(<FinanceKpiCard label="Pending" value={3} hint="test" />);
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('FinanceEmptyState renders without crash', () => {
    render(<FinanceEmptyState title="All clear" description="Nothing queued" />);
    expect(screen.getByText('All clear')).toBeTruthy();
  });

  it('CreditExceptionStatusChip shows pending', () => {
    render(<CreditExceptionStatusChip status="pending" />);
    expect(screen.getByText(/Pending approval/i)).toBeTruthy();
  });

  it('FinanceTabs renders tab buttons', () => {
    const tabs = [
      { id: 'a', label: 'Overview' },
      { id: 'b', label: 'Credit' },
    ];
    render(<FinanceTabs tabs={tabs} active="a" onChange={() => {}} />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Credit')).toBeTruthy();
  });
});
