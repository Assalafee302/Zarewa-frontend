import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductionRowMenu } from './ProductionRowMenu';

afterEach(() => cleanup());

describe('ProductionRowMenu', () => {
  it('names the kebab for the job', () => {
    render(
      <ProductionRowMenu
        rowKey="live-CL-1"
        openKey={null}
        setOpenKey={vi.fn()}
        onView={vi.fn()}
        label="job CL-1"
      />
    );
    expect(screen.getByRole('button', { name: 'Actions for job CL-1' })).toBeTruthy();
  });

  it('opens and executes View', async () => {
    const user = userEvent.setup();
    const setOpenKey = vi.fn();
    const onView = vi.fn();
    render(
      <ProductionRowMenu
        rowKey="live-CL-1"
        openKey="live-CL-1"
        setOpenKey={setOpenKey}
        onView={onView}
        label="job CL-1"
      />
    );
    await user.click(screen.getByRole('menuitem', { name: /view/i }));
    expect(onView).toHaveBeenCalled();
    expect(setOpenKey).toHaveBeenCalledWith(null);
  });
});
