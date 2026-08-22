import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '../../lib/apiBase';
import { ReportFaultPanel } from './ReportFaultPanel';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => cleanup());

describe('ReportFaultPanel', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('blocks submit when the plant register is empty', async () => {
    apiFetch.mockResolvedValue({ ok: true, data: { machines: [] } });
    const user = userEvent.setup();
    render(<ReportFaultPanel branchId="BR-KD" />);
    await user.click(screen.getByRole('button', { name: /report a fault/i }));
    expect(await screen.findByText(/no machines on the plant register/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit fault/i })).toBeDisabled();
  });

  it('lists machines that are under repair and hides decommissioned ones', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      data: {
        machines: [
          { id: 'M-1', name: 'Line A', machineCode: 'LA', status: 'under_maintenance' },
          { id: 'M-2', name: 'Old mill', status: 'decommissioned' },
        ],
      },
    });
    const user = userEvent.setup();
    render(<ReportFaultPanel />);
    await user.click(screen.getByRole('button', { name: /report a fault/i }));
    expect(await screen.findByRole('option', { name: /line a/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /old mill/i })).toBeNull();
  });

  it('does not treat a failed plant-register load as an empty register', async () => {
    apiFetch.mockResolvedValue({ ok: false, data: { error: 'Could not load machines.' } });
    const user = userEvent.setup();
    render(<ReportFaultPanel />);
    await user.click(screen.getByRole('button', { name: /report a fault/i }));
    expect(await screen.findByText(/could not load machines/i)).toBeInTheDocument();
    expect(screen.queryByText(/no machines on the plant register/i)).toBeNull();
    expect(screen.getByRole('button', { name: /submit fault/i })).toBeDisabled();
  });

  it('posts photo bytes without the preview data URL', async () => {
    class FileReaderStub {
      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,abc123';
        this.onload?.();
      }
    }
    globalThis.FileReader = FileReaderStub;
    let posted;
    apiFetch.mockImplementation(async (_url, opts) => {
      if (opts?.method === 'POST') {
        posted = opts.body;
        return { ok: true, data: { ok: true, workOrderId: 'MWO-1' } };
      }
      return {
        ok: true,
        data: { machines: [{ id: 'M-1', name: 'Line A', status: 'active' }] },
      };
    });
    const user = userEvent.setup();
    render(<ReportFaultPanel branchId="BR-KD" />);
    await user.click(screen.getByRole('button', { name: /report a fault/i }));
    const machine = await screen.findByLabelText(/^machine/i);
    await user.selectOptions(machine, 'M-1');
    await user.type(screen.getByLabelText(/symptom/i), 'Belt slip');
    const file = new File(['x'], 'fault.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/photo/i), file);
    await user.click(screen.getByRole('button', { name: /submit fault/i }));
    expect(posted?.attachment?.dataBase64).toBe('abc123');
    expect(posted?.attachment?.previewUrl).toBeUndefined();
  });
});
