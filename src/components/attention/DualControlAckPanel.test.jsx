import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DualControlAckPanel } from './DualControlAckPanel.jsx';
import { userMayAcknowledgeDualControlClient } from '../../lib/dualControlAck';
import { percentPaid } from '../../lib/quotePaidPercent';

afterEach(() => cleanup());

const ACK = {
  refundId: 'RF-1',
  kind: 'same_approver_payer',
  note: 'Only cashier on duty that day.',
  acknowledgedBy: 'Test MD',
  acknowledgedAtIso: '2026-10-19T10:00:00.000Z',
  auditId: 'AUD-1',
};

function fakeApi(initial = []) {
  let acks = [...initial];
  const calls = [];
  const fn = vi.fn(async (url, opts) => {
    calls.push({ url, opts });
    if (url.startsWith('/api/management/dual-control/acknowledgements')) return { ok: true, data: { ok: true, items: acks } };
    if (url === '/api/management/dual-control/acknowledge') {
      const body = JSON.parse(opts.body);
      acks = [...acks, { ...ACK, kind: body.kind, note: body.note }];
      return { ok: true, data: { ok: true } };
    }
    return { ok: false, data: {} };
  });
  return { fn, calls };
}

describe('DualControlAckPanel', () => {
  it('MD acknowledges with a note; the record then shows who, when and the note', async () => {
    const api = fakeApi();
    const onAck = vi.fn();
    render(<DualControlAckPanel refundId="RF-1" openKinds={['same_approver_payer']} canAcknowledge onAcknowledged={onAck} fetchImpl={api.fn} />);
    const btn = await screen.findByRole('button', { name: 'Acknowledge with note' });
    fireEvent.click(btn);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(api.calls.some((c) => c.url === '/api/management/dual-control/acknowledge')).toBe(false);

    fireEvent.change(screen.getByLabelText(/Acknowledge with note/), { target: { value: 'Only cashier on duty that day.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge with note' }));
    await waitFor(() => expect(onAck).toHaveBeenCalled());
    const post = api.calls.find((c) => c.url === '/api/management/dual-control/acknowledge');
    expect(JSON.parse(post.opts.body)).toEqual({ refundId: 'RF-1', kind: 'same_approver_payer', note: 'Only cashier on duty that day.' });
    expect(await screen.findByText(/Approved and paid by the same person — acknowledged/)).toBeTruthy();
    expect(screen.getByText('Test MD')).toBeTruthy();
    expect(screen.getByText('“Only cashier on duty that day.”')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Acknowledge with note' })).toBeNull();
  });

  it('others see the open warning but no form; history stays visible on the record', async () => {
    const api = fakeApi([ACK]);
    render(<DualControlAckPanel refundId="RF-1" openKinds={['same_requester_approver']} canAcknowledge={false} fetchImpl={api.fn} />);
    expect(await screen.findByText(/Only the MD or CEO can acknowledge it/)).toBeTruthy();
    expect(screen.getByText(/Approved and paid by the same person — acknowledged/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Acknowledge with note' })).toBeNull();
  });

  it('renders nothing for a refund with no warnings', async () => {
    const api = fakeApi();
    const { container } = render(<DualControlAckPanel refundId="RF-9" fetchImpl={api.fn} />);
    await waitFor(() => expect(api.fn).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });

  it('MD/CEO only on the client too', () => {
    expect(userMayAcknowledgeDualControlClient({ roleKey: 'md' })).toBe(true);
    expect(userMayAcknowledgeDualControlClient({ roleKey: 'ceo' })).toBe(true);
    expect(userMayAcknowledgeDualControlClient({ roleKey: 'admin' })).toBe(false);
  });
});

describe('percentPaid (clearance panel)', () => {
  it('shows the real figure, not capped at 100%', () => {
    expect(percentPaid(140_000, 100_000)).toBe(140);
    expect(percentPaid(45_000, 100_000)).toBe(45);
    expect(percentPaid(0, 0)).toBe(0);
    expect(percentPaid(5, 0)).toBe(100);
  });
});
