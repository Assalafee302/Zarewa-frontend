import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ExecAttentionList } from './ExecAttentionList.jsx';
import { ExecWorkTrayPanel } from './ExecWorkTrayPanel.jsx';
import { explainAttentionItem } from '../../shared/lib/attentionRules.js';

const NOW = '2026-10-19T09:00:00.000Z';
const money = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;

function withAttention(item) {
  return { ...item, attention: explainAttentionItem(item, { nowIso: NOW }) };
}

const items = [
  withAttention({
    id: 'refund:RF-OLD',
    kind: 'refunds',
    title: 'RF-OLD',
    branchName: 'Kaduna',
    amountNgn: 100_000,
    atIso: '2026-10-09',
    row: { amount_ngn: 100_000, customer_name: 'Old Customer', reason_category: 'Overpayment' },
  }),
  withAttention({
    id: 'refund:RF-NEW',
    kind: 'refunds',
    title: 'RF-NEW',
    branchName: 'Kaduna',
    amountNgn: 1_408_453,
    atIso: '2026-10-16',
    row: { amount_ngn: 1_408_453, customer_name: 'Tahir Musa', reason_category: 'Overpayment' },
  }),
  withAttention({
    id: 'payment:PR-1',
    kind: 'payments',
    title: 'PR-1',
    branchName: 'Yola',
    amountNgn: 20_000,
    atIso: '2026-10-18',
    row: { amount_requested_ngn: 20_000, description: 'Diesel' },
  }),
];

afterEach(() => cleanup());

describe('ExecAttentionList (MD needs-your-attention)', () => {
  it('groups by type with counts and ₦ totals; each row is the sentence + amount + age', () => {
    render(<ExecAttentionList items={items} formatNgn={money} onOpen={() => {}} />);
    expect(screen.getByTestId('attention-summary').textContent).toBe('3 items · ₦1,528,453');
    const refunds = screen.getByTestId('attention-group-refunds');
    expect(within(refunds).getByText('Refunds')).toBeTruthy();
    expect(within(refunds).getByText('· 2')).toBeTruthy();
    expect(within(refunds).getByText('₦1,508,453')).toBeTruthy();
    expect(
      within(refunds).getByText(
        'Refund ₦1,408,453 to Tahir Musa (Overpayment) requested 16 Oct is waiting for approval — 3 days'
      )
    ).toBeTruthy();
    expect(within(refunds).getByText('Also: above executive refund limit')).toBeTruthy();
    expect(within(refunds).getByText('3 days')).toBeTruthy();
    expect(screen.getByTestId('attention-group-cash_out')).toBeTruthy();
  });

  it('newest first by default, oldest first on toggle', () => {
    render(<ExecAttentionList items={items} formatNgn={money} onOpen={() => {}} />);
    const order = () =>
      within(screen.getByTestId('attention-group-refunds'))
        .getAllByTestId('attention-row')
        .map((b) => b.getAttribute('data-attention-id'));
    expect(order()).toEqual(['refund:RF-NEW', 'refund:RF-OLD']);
    fireEvent.click(screen.getByRole('button', { name: 'Oldest first' }));
    expect(order()).toEqual(['refund:RF-OLD', 'refund:RF-NEW']);
  });

  it('one tap opens the record', () => {
    const onOpen = vi.fn();
    render(<ExecAttentionList items={items} formatNgn={money} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByTestId('attention-row')[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'refund:RF-NEW' }));
  });
});

describe('ExecWorkTrayPanel (Decide tab)', () => {
  it('shows the sentence instead of a bare type/Review chip; legacy keeps the old row', () => {
    const { rerender } = render(<ExecWorkTrayPanel items={items} formatNgn={money} onReview={() => {}} />);
    expect(
      screen.getAllByText('Payment request ₦20,000 for “Diesel” requested 18 Oct is waiting for approval — 1 day').length
    ).toBeGreaterThan(0);
    expect(screen.queryAllByText('Review', { selector: 'span' })).toHaveLength(0);
    rerender(<ExecWorkTrayPanel items={items} formatNgn={money} onReview={() => {}} legacy />);
    expect(screen.queryAllByTestId('work-tray-sentence').some((n) => n.textContent.includes('Diesel'))).toBe(false);
  });
});
