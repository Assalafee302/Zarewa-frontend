import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AttentionBanner } from './AttentionBanner.jsx';
import { explainAttentionItem } from '../../shared/lib/attentionRules.js';

const NOW = '2026-10-19T09:00:00.000Z';

const overpaidQuote = explainAttentionItem(
  {
    id: 'clearance:QT-1',
    kind: 'clearance',
    quotationRef: 'QT-1',
    row: { total_ngn: 100_000, paid_ngn: 140_000, date_iso: '2026-10-08' },
  },
  { nowIso: NOW }
);

afterEach(() => cleanup());

describe('AttentionBanner', () => {
  it('states every flag with its evidence and the clearing actions', () => {
    const onAction = vi.fn();
    render(<AttentionBanner attention={overpaidQuote} onAction={onAction} />);
    const banner = screen.getByTestId('attention-banner');
    expect(within(banner).getByText('2 problems on this record')).toBeTruthy();
    expect(within(banner).getByText('Paid ₦140,000 against a ₦100,000 quote — ₦40,000 above')).toBeTruthy();
    expect(
      within(banner).getByText('QT-1: ₦140,000 paid of ₦100,000 (140%) and not yet cleared by a manager — 11 days')
    ).toBeTruthy();
    expect(within(banner).getByText('Above quote')).toBeTruthy();
    expect(within(banner).getAllByText('₦40,000').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('attention-banner-action-clear'));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'clear', label: 'Clear', kind: 'decide' }));
    // actions are de-duplicated across flags
    expect(screen.getAllByTestId('attention-banner-action-clear')).toHaveLength(1);
    expect(screen.getByTestId('attention-banner-action-flag')).toBeTruthy();
  });

  it('hides decision actions when read-only and hidden actions on request', () => {
    const refund = explainAttentionItem(
      { id: 'dual', kind: 'governance', refundId: 'RF-1', row: { kind: 'same_approver_payer', amountNgn: 1, paidBy: 'A' } },
      { nowIso: NOW }
    );
    const { rerender } = render(<AttentionBanner attention={overpaidQuote} onAction={() => {}} readOnly />);
    expect(screen.queryByTestId('attention-banner-action-clear')).toBeNull();
    rerender(<AttentionBanner attention={refund} onAction={() => {}} hideActions={['open']} />);
    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.queryByTestId('attention-banner-action-open')).toBeNull();
  });

  it('renders nothing without flags', () => {
    const { container } = render(<AttentionBanner attention={{ flags: [] }} />);
    expect(container.innerHTML).toBe('');
  });
});
