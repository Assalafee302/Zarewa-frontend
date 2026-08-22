import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesMobileAlertStrip from './SalesMobileAlertStrip';

describe('SalesMobileAlertStrip', () => {
  it('tapping a follow-up alert runs the handler', async () => {
    const user = userEvent.setup();
    const onFollowUp = vi.fn();
    render(
      <SalesMobileAlertStrip
        salesTab="quotations"
        followUpCount={3}
        onFollowUp={onFollowUp}
      />
    );
    await user.click(screen.getByRole('button', { name: /3 quote follow-ups/i }));
    expect(onFollowUp).toHaveBeenCalledTimes(1);
  });
});
