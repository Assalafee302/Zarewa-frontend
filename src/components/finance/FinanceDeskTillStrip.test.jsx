import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceDeskTillStrip } from './FinanceDeskTillStrip.jsx';

describe('FinanceDeskTillStrip', () => {
  it('renders till board tiles with warn labels when queues are non-zero', () => {
    render(
      <FinanceDeskTillStrip
        bookTotalNgn={500000}
        pendingReceipts={2}
        pendingReceiptsNgn={120000}
        payouts={3}
        confirmedToday={5}
      />
    );
    expect(screen.getByRole('region', { name: 'Till now' })).toBeTruthy();
    expect(screen.getByText('To confirm')).toBeTruthy();
    expect(screen.getByText('To pay')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
