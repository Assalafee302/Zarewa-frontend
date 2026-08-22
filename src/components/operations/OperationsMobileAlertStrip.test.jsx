import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OperationsMobileAlertStrip from './OperationsMobileAlertStrip';

afterEach(() => cleanup());

describe('OperationsMobileAlertStrip', () => {
  it('tapping in-transit jumps to On hand', async () => {
    const user = userEvent.setup();
    const onGoInventory = vi.fn();
    render(
      <OperationsMobileAlertStrip
        inTransitCount={2}
        onGoInventory={onGoInventory}
      />
    );
    await user.click(screen.getByRole('button', { name: /2 to receive/i }));
    expect(onGoInventory).toHaveBeenCalledTimes(1);
  });
});
