import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SalesDeskToolbar } from './SalesDeskToolbar';

vi.mock('../AiAskButton', () => ({
  AiAskButton: ({ children, className, title }) => (
    <button type="button" className={className} title={title}>
      {children}
    </button>
  ),
}));

afterEach(() => cleanup());

describe('SalesDeskToolbar', () => {
  it('keeps Recalculate behind the admin menu', async () => {
    const user = userEvent.setup();
    const onReconcile = vi.fn();
    render(
      <SalesDeskToolbar
        salesTab="quotations"
        onCreate={vi.fn()}
        isAdmin
        onReconcile={onReconcile}
      />
    );

    expect(screen.queryByRole('menuitem', { name: /recalculate sales data/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Admin tools' }));
    await user.click(screen.getByRole('menuitem', { name: /recalculate sales data/i }));
    expect(onReconcile).toHaveBeenCalledTimes(1);
  });

  it('treats Advance as secondary on the receipts tab', () => {
    render(
      <SalesDeskToolbar salesTab="receipts" onCreate={vi.fn()} onAdvance={vi.fn()} />
    );
    const record = screen.getByRole('button', { name: /record payment/i });
    const advance = screen.getByRole('button', { name: /advance/i });
    expect(record.className).toMatch(/bg-zarewa-teal/);
    expect(advance.className).not.toMatch(/bg-zarewa-teal/);
    expect(advance.className).toMatch(/border-slate-200/);
  });

  it('styles Ask AI as a ghost control and hides admin tools for non-admins', () => {
    render(<SalesDeskToolbar salesTab="quotations" onCreate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /ask ai/i }).className).toMatch(/text-slate-500/);
    expect(screen.queryByRole('button', { name: 'Admin tools' })).toBeNull();
  });
});
