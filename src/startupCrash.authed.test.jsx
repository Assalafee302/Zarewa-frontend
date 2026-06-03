/**
 * Authenticated startup — catches TDZ when Dashboard/LegacyDashboard loads after session restore.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React, { StrictMode } from 'react';

vi.mock('./lib/firebase.js', () => ({
  firebaseConfigured: false,
  auth: null,
  app: null,
  db: null,
  storage: null,
  functions: null,
  analyticsPromise: Promise.resolve(null),
}));

vi.mock('./lib/apiBase.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiFetch: vi.fn(async (path) => {
      if (String(path).includes('/bootstrap')) {
        return {
          ok: true,
          data: {
            ok: true,
            session: {
              user: {
                id: 'u1',
                username: 'test.user',
                displayName: 'Test User',
                roleKey: 'branch_manager',
                branchId: 'BR1',
              },
              currentBranchId: 'BR1',
              permissions: ['sales.view', 'office.view', 'workspace.view'],
            },
            unifiedWorkItems: [],
            apiOnline: true,
          },
        };
      }
      return { ok: false, data: null };
    }),
  };
});

describe('authenticated startup TDZ', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders workspace shell without error boundary crash', async () => {
    window.history.pushState({}, '', '/');
    const { default: App } = await import('./App.jsx');
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    await waitFor(
      () => {
        expect(screen.queryByText(/Zarewa could not load/i)).toBeNull();
      },
      { timeout: 15000 }
    );
  });

  it('renders manager home without error boundary crash', async () => {
    const { apiFetch } = await import('./lib/apiBase.js');
    apiFetch.mockImplementation(async (path) => {
      if (String(path).includes('/bootstrap')) {
        return {
          ok: true,
          data: {
            ok: true,
            session: {
              user: {
                id: 'u2',
                username: 'manager.user',
                displayName: 'Manager User',
                roleKey: 'sales_manager',
                branchId: 'BR1',
              },
              currentBranchId: 'BR1',
              permissions: ['sales.view', 'manager.view', 'reports.view'],
            },
            unifiedWorkItems: [],
            apiOnline: true,
          },
        };
      }
      return { ok: false, data: null };
    });
    window.history.pushState({}, '', '/');
    const { default: App } = await import('./App.jsx');
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    await waitFor(
      () => {
        expect(screen.queryByText(/Zarewa could not load/i)).toBeNull();
      },
      { timeout: 15000 }
    );
  });
});
