import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MaterialPricingWorkbookChrome } from './MaterialPricingWorkbookChrome.jsx';

afterEach(() => cleanup());

const baseProps = {
  materialKey: 'alu',
  onMaterialKey: vi.fn(),
  branches: [{ id: 'BR-T', name: 'Kaduna (HQ)' }],
  branchId: 'BR-T',
  onBranchId: vi.fn(),
  lookbackDays: 30,
  costKgValue: '',
  onCostKgChange: vi.fn(),
  onSyncAllChange: vi.fn(),
};

function renderChrome(props = {}) {
  return render(
    <MemoryRouter>
      <MaterialPricingWorkbookChrome {...baseProps} {...props}>
        <button type="button">Save drafts</button>
        <button type="button">Publish to price list</button>
      </MaterialPricingWorkbookChrome>
    </MemoryRouter>
  );
}

describe('MaterialPricingWorkbookChrome', () => {
  it('keeps materials as underline tabs and hides tutorial copy until help is opened', async () => {
    const user = userEvent.setup();
    renderChrome();

    expect(screen.getByRole('tablist', { name: 'Workbook material' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Aluminium' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /aluzinc/i })).toBeInTheDocument();

    expect(screen.queryByText(/1\. Draft/i)).toBeNull();
    expect(screen.queryByText(/how a row becomes a selling price/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'How pricing works' }));
    expect(screen.getByText(/how a row becomes a selling price/i)).toBeInTheDocument();
  });

  it('puts print and refresh behind More, and skips the inner title on the page', async () => {
    const user = userEvent.setup();
    const onPrint = vi.fn();
    renderChrome({
      isPage: true,
      moreItems: [
        { id: 'print-customer', label: 'Customer price list', onClick: onPrint },
        { id: 'refresh', label: 'Refresh' },
      ],
    });

    expect(screen.queryByRole('heading', { name: /material pricing workbook/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /customer price list/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'More workbook tools' }));
    await user.click(screen.getByRole('menuitem', { name: /customer price list/i }));
    expect(onPrint).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('button', { name: /save drafts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish to price list/i })).toBeInTheDocument();
  });
});
