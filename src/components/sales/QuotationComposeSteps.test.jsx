import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotationComposeSteps } from './QuotationComposeSteps';

afterEach(() => cleanup());

describe('QuotationComposeSteps', () => {
  it('keeps Lines locked until customer is ready', async () => {
    const user = userEvent.setup();
    const onStep = vi.fn();
    render(
      <QuotationComposeSteps
        step="customer"
        onStep={onStep}
        customerReady={false}
        linesReady={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /lines/i }));
    expect(onStep).not.toHaveBeenCalled();
  });

  it('allows Lines after customer is ready', async () => {
    const user = userEvent.setup();
    const onStep = vi.fn();
    render(
      <QuotationComposeSteps
        step="customer"
        onStep={onStep}
        customerReady
        linesReady={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /lines/i }));
    expect(onStep).toHaveBeenCalledWith('lines');
  });

  it('keeps Pay locked until lines are ready', async () => {
    const user = userEvent.setup();
    const onStep = vi.fn();
    render(
      <QuotationComposeSteps
        step="lines"
        onStep={onStep}
        customerReady
        linesReady={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /pay/i }));
    expect(onStep).not.toHaveBeenCalled();
  });
});
