import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageTabs } from './PageTabs';

afterEach(() => cleanup());

describe('PageTabs', () => {
  const tabs = [
    { id: 'quotations', label: 'Quotations' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'refund', label: 'Refunds' },
  ];

  it('moves selection with arrow keys and keeps one tab stop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <PageTabs tabs={tabs} value="quotations" onChange={onChange} panelId="sales-records-panel" />
    );

    const quoteTab = screen.getByRole('tab', { name: 'Quotations' });
    const receiptTab = screen.getByRole('tab', { name: 'Receipts' });
    expect(quoteTab).toHaveAttribute('tabindex', '0');
    expect(receiptTab).toHaveAttribute('tabindex', '-1');
    expect(quoteTab).toHaveAttribute('aria-controls', 'sales-records-panel');

    quoteTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('receipts');

    rerender(<PageTabs tabs={tabs} value="receipts" onChange={onChange} panelId="sales-records-panel" />);
    expect(screen.getByRole('tab', { name: 'Receipts' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Quotations' })).toHaveAttribute('tabindex', '-1');
  });
});
