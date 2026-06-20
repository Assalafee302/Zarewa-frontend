import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceReceiptsWorkflowStrip } from './FinanceReceiptsWorkflowStrip';

describe('FinanceReceiptsWorkflowStrip', () => {
  it('shows pending and confirmed counts', () => {
    render(
      <FinanceReceiptsWorkflowStrip pendingCount={3} confirmedCount={12} pendingNgn={50000} openBankDeposits={2} />
    );
    expect(screen.getByTestId('finance-receipts-workflow-strip')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });
});
