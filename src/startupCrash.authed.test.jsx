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

  it('renders CEO exec home without error boundary crash', async () => {
    const { apiFetch } = await import('./lib/apiBase.js');
    apiFetch.mockImplementation(async (path) => {
      if (String(path).includes('/bootstrap')) {
        return {
          ok: true,
          data: {
            ok: true,
            session: {
              user: {
                id: 'u3',
                username: 'ceo.user',
                displayName: 'CEO User',
                roleKey: 'ceo',
                branchId: 'BR1',
              },
              currentBranchId: 'BR1',
              permissions: ['exec.dashboard.view', 'dashboard.view', 'reports.view', 'office.use'],
            },
            unifiedWorkItems: [],
            apiOnline: true,
          },
        };
      }
      if (String(path).includes('/api/exec/dashboard')) {
        return {
          ok: true,
          data: {
            ok: true,
            generatedAtISO: new Date().toISOString(),
            actor: { role: 'ceo', readOnlyExecutiveView: true, canActOnApprovals: false },
            period: { key: 'month', startISO: '2026-06-01', endISO: '2026-06-04', biPeriodKey: 'month' },
            dataScopeNotes: [],
            branchScope: 'ALL',
            kpis: { collectionRateLabel: 'Quoted collection rate' },
            decisionAlerts: [],
            workTray: { items: [], summary: { total: 0, byKind: {} }, readOnlyForActor: true },
            sales: {},
            inventory: { skuIntelligence: { stonecoated: {} } },
            expenses: {},
            branches: { highlights: {}, byBranch: [], comparisonAvailable: false },
            cash: { pendingRefunds: 0, pendingRefundsIsCount: true },
            risks: { alerts: [] },
            reports: [],
          },
        };
      }
      if (String(path).includes('/api/exec/summary')) {
        return { ok: true, data: { ok: true, counts: {}, productionMetrics: {}, branches: [] } };
      }
      return { ok: false, data: null };
    });
    window.history.pushState({}, '', '/exec');
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
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /Executive Command Centre/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  });
});
