/**
 * Authenticated startup — catches TDZ when Dashboard/LegacyDashboard loads after session restore.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
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

  it(
    'renders workspace shell without error boundary crash',
    async () => {
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
    },
    90_000
  );

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
            actor: {
              role: 'ceo',
              readOnlyExecutiveView: true,
              canActOnApprovals: false,
              canManageReservePolicy: false,
            },
            period: { key: 'month', startISO: '2026-06-01', endISO: '2026-06-04', biPeriodKey: 'month' },
            dataScopeNotes: [
              { id: 'bi-lookback-partial', level: 'info', message: 'SKU weeks-cover uses BI lookback' },
            ],
            branchScope: 'ALL',
            kpis: { collectionRateLabel: 'Quoted collection rate' },
            decisionAlerts: [],
            workTray: {
              items: [
                {
                  id: 'refunds:summary',
                  kind: 'refunds',
                  title: 'Refund approvals pending — 2 items',
                  summaryOnly: true,
                  scopeBasis: 'company',
                  canAct: false,
                  route: '/manager',
                },
              ],
              summary: { total: 1, byKind: { refunds: 1 } },
              readOnlyForActor: true,
            },
            sales: {
              debtBasisLabel: 'Current outstanding as at 2026-06-04',
              topCustomersByDebt: [
                {
                  customerID: 'C1',
                  customerName: 'Acme',
                  debtNgn: 500000,
                  debtRiskLabel: 'Watch',
                  aging: { days0_30: 0, days31_60: 500000, days61_90: 0, days90_plus: 0 },
                  route: '/customers/C1',
                  ledgerRoute: '/accounts',
                  reportsRoute: '/reports',
                },
              ],
            },
            inventory: {
              skuPeriodNote: 'Weeks-cover uses BI lookback.',
              drillRoutes: { analytics: '/exec?tab=intelligence', operations: '/operations' },
              skuIntelligence: {
                aluzinc: {
                  buyNext: [
                    {
                      gauge: '0.24',
                      colour: 'Ivory',
                      weeksCover: 1.5,
                      selectedPeriodMetres: 1200,
                      lookbackDemandBasisLabel: 'BI lookback',
                      recommendation: 'Buy Soon',
                      action: 'buy',
                      reason: 'Low cover',
                    },
                  ],
                  reduceStock: [],
                  needsAttention: [],
                  topCombinations: [{ gauge: '0.24', colour: 'Ivory', profile: 'Corrugated', metres: 1200 }],
                },
                aluminium: { buyNext: [], reduceStock: [], needsAttention: [], topCombinations: [] },
                stonecoated: { note: 'Stone summary' },
              },
            },
            expenses: {},
            branches: { highlights: {}, byBranch: [], comparisonAvailable: false },
            cash: {
              pendingRefunds: 0,
              pendingRefundsIsCount: true,
              pendingRefundsScope: 'company',
              payrollDraftsAwaitingMdScope: 'company',
              pressureModelLabel: 'Estimated cash pressure based on recent treasury activity',
              notSafeWithdrawalNote: 'Not a safe-withdrawal calculation',
            },
            workingCapital: {
              label: 'Estimated working capital snapshot',
              notStatutoryAccounts: true,
              notWithdrawableCash: true,
              currentAssets: [
                { id: 'cash', label: 'Cash / bank position', amountNgn: 1000000, available: true, estimated: false },
              ],
              currentLiabilities: [
                { id: 'ap', label: 'Supplier payables (AP outstanding)', amountNgn: 200000, available: true, estimated: false },
              ],
              assetTotalNgn: 1000000,
              liabilityTotalNgn: 200000,
              estimatedWorkingCapitalNgn: 800000,
              ratio: 5,
              notes: ['Working capital is not the same as free cash.'],
            },
            payables: {
              apOutstandingNgn: 200000,
              approvedUnpaidPaymentRequestsNgn: 50000,
              poCommitmentGapNgn: 10000,
              poCommitmentLabel: 'Commitment proxy (ordered − received on PO lines)',
              pressureNotes: [],
            },
            reservePolicy: {
              configured: false,
              completionPct: 0,
              headroomHidden: true,
              phaseNote: 'Indicative expansion headroom remains hidden in this phase.',
              missingLabels: ['Operating reserve'],
              policy: {
                operatingReserveNgn: { value: null, configured: false, label: 'Operating reserve' },
                includeReceivables: { value: false, configured: false, recommended: false },
                includeInventory: { value: false, configured: false, recommended: false },
                includePoCommitments: { value: true, configured: false, recommended: true },
              },
              note: 'Reserve policy is incomplete. Indicative expansion headroom is hidden.',
            },
            materialCosting: {
              label: 'Estimated material cost per metre',
              estimated: true,
              excludes: ['labour', 'diesel'],
              notes: ['Estimated material cost only.'],
              rows: [],
            },
            targets: {
              basis: 'company',
              configured: false,
              rows: [
                {
                  metricKey: 'naira_sales',
                  label: 'Produced revenue (month target)',
                  target: null,
                  actual: 0,
                  status: 'No Target Set',
                  unit: 'NGN',
                },
              ],
            },
            staffActivity: {
              label: 'Staff activity summary',
              notPerformanceRanking: true,
              legacyNote: 'Text-only handled_by excluded.',
              rows: [],
            },
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
    window.history.pushState({}, '', '/exec?tab=finance');
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
        expect(screen.getByRole('heading', { name: /Command Centre/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Cash & Treasury/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Working Capital Snapshot/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Reserve Policy/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
    fireEvent.click(screen.getByRole('button', { name: /^Overview$/i }));
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /Targets vs Actuals/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Decision Alerts/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  });
});
