import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from './LoginScreen.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
const mockWorkspace = {
  login: mockLogin,
  clearSessionMessage: vi.fn(),
  status: 'auth_required',
};

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspace,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
    mockWorkspace.status = 'auth_required';
    mockWorkspace.sessionMessage = '';
    mockWorkspace.clearSessionMessage.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits entered credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: true,
      data: {
        user: { department: 'admin' },
        permissions: ['*'],
      },
    });
    render(<LoginScreen />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(document.getElementById('login-password'), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /enter workspace/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'Admin@123');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/office', { replace: true });
    });
  });

  it('shows backend login errors', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ ok: false, error: 'Invalid username or password.' });
    render(<LoginScreen />);

    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(document.getElementById('login-password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /enter workspace/i }));

    await expect(screen.getByText(/invalid username or password/i)).toBeVisible();
  });

  it('shows and auto-dismisses session expiry notices', () => {
    vi.useFakeTimers();
    try {
      mockWorkspace.sessionMessage = 'Your session has expired. Please sign in again.';
      render(<LoginScreen />);

      expect(screen.getByText(/your session has expired/i)).toBeVisible();
      expect(mockWorkspace.clearSessionMessage).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.queryByText(/your session has expired/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
