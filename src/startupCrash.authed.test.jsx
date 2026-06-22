/**
 * Authenticated startup — catches TDZ when Dashboard/LegacyDashboard loads after session restore.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

function jsonFetchResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => '' },
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}

function apiPathFromFetchInput(input) {
  const url = typeof input === 'string' ? input : String(input?.url ?? input);
  const idx = url.indexOf('/api/');
  return idx >= 0 ? url.slice(idx) : url;
}

const CEO_EXEC_DASHBOARD = {
  ok: true,
  generatedAtISO: new Date().toISOString(),
  actor: {
    role: 'ceo',
    readOnlyExecutiveView: true,
    canActOnApprovals: false,
    canManageReservePolicy: false,
  },
  period: { key: 'month', startISO: '2026-06-01', endISO: '2026-06-04', biPeriodKey: 'month' },
  dataScopeNotes: [{ id: 'bi-lookback-partial', level: 'info', message: 'SKU weeks-cover uses BI lookback' }],
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
};

function bootstrapPayload(sessionUser, permissions) {
  return {
    ok: true,
    session: {
      user: sessionUser,
      currentBranchId: sessionUser.branchId,
      permissions,
    },
    permissions,
    unifiedWorkItems: [],
    apiOnline: true,
  };
}

/** WorkspaceContext uses native fetch (not apiFetch) for bootstrap polling. */
function installFetchMock(overrides = {}) {
  return vi.fn(async (input) => {
    const path = apiPathFromFetchInput(input);
    if (path.includes('/api/bootstrap')) {
      return jsonFetchResponse(overrides.bootstrap ?? bootstrapPayload(
        {
          id: 'u1',
          username: 'test.user',
          displayName: 'Test User',
          roleKey: 'branch_manager',
          branchId: 'BR1',
        },
        ['sales.view', 'office.view', 'workspace.view']
      ));
    }
    if (path.includes('/api/dashboard/summary')) {
      return jsonFetchResponse({ ok: true });
    }
    if (path.includes('/api/workspace/revision')) {
      return jsonFetchResponse({ ok: true, revision: 1 });
    }
    if (path.includes('/api/edit-approvals/pending')) {
      return jsonFetchResponse({ ok: true, items: [] });
    }
    if (path.includes('/api/exec/dashboard')) {
      return jsonFetchResponse(overrides.execDashboard ?? CEO_EXEC_DASHBOARD);
    }
    if (path.includes('/api/finance/trial-exceptions')) {
      return jsonFetchResponse({ ok: true, exceptions: [] });
    }
    if (path.includes('/api/finance/desk-overview')) {
      return jsonFetchResponse({
        ok: true,
        exceptionTotal: 0,
        exceptions: { ok: true, exceptions: {} },
        opening: { posted: false },
        pack: { alreadyPosted: false, sources: [] },
        cutoverPlan: {
          summary: 'Cutover in progress',
          progressPct: 40,
          disclaimer: 'Test plan',
          phases: [],
        },
        statements: null,
        close: { steps: [] },
      });
    }
    if (path.includes('/api/finance/cutover-plan')) {
      return jsonFetchResponse({
        ok: true,
        summary: 'Cutover in progress',
        progressPct: 40,
        disclaimer: 'Test plan',
        phases: [],
      });
    }
    if (path.includes('/api/finance/opening-balance/status') || path.includes('/api/finance/opening-pack')) {
      return jsonFetchResponse({ ok: true, posted: false, alreadyPosted: false, sources: [] });
    }
    if (path.includes('/api/finance/month-end-close') || path.includes('/api/finance/statements-pack')) {
      return jsonFetchResponse({ ok: true, steps: [] });
    }
    if (path.includes('/api/workspace/finance-snapshot')) {
      return jsonFetchResponse({
        ok: true,
        domain: 'finance',
        treasuryAccounts: [{ id: 1, name: 'Main till', type: 'cash', balance: 1000, bankName: 'Cash' }],
        paymentRequests: [],
        refunds: [],
        registerSettlementsAwaitingPayment: [],
        poTransportAwaitingTreasury: [],
        poTransportMissingLink: [],
        poTransportCatchUp: [],
        orphanHaulageTreasuryMovements: [],
        staffRecoveriesDue: [],
        staffObligationsDue: [],
        receipts: [],
      });
    }
    if (path.includes('/api/hr/me')) {
      return jsonFetchResponse({
        ok: true,
        user: { id: 'u-hr', displayName: 'HR Staff', username: 'staff.user' },
        hr: {
          jobTitle: 'Operator',
          dateJoinedIso: '2020-01-01',
          employmentType: 'permanent',
          baseSalaryNgn: 150000,
        },
        completeness: { sections: [{ id: 'employment', pct: 100 }] },
        documentSummary: { total: 0, verified: 0, pending: 0, rejected: 0 },
        pendingProfileRequests: [],
        loanPolicy: { loanMinServiceYears: 3, loanMaxSalaryMonths: 4, loanMaxRepaymentMonths: 12 },
        documents: [],
        unreadNotifications: 0,
      });
    }
    if (path.includes('/api/hr/leave/balances')) {
      return jsonFetchResponse({ ok: true, balances: [] });
    }
    if (path.includes('/api/hr/payslips')) {
      return jsonFetchResponse({ ok: true, payslips: [], periodHint: null });
    }
    if (path.includes('/api/hr/requests')) {
      return jsonFetchResponse({ ok: true, requests: [] });
    }
    if (path.includes('/api/hr/me/attendance-summary')) {
      return jsonFetchResponse({ ok: true, absentDays: 0, lateDays: 0, deductionNgn: 0 });
    }
    if (path.includes('/money-summary')) {
      return jsonFetchResponse({
        ok: true,
        totalOutstandingNgn: 0,
        loans: [],
        purchases: [],
        recoveries: [],
        purchaseEligibility: { eligible: true, issues: [] },
      });
    }
    if (path.includes('/loan-schedule') || path.includes('/loans/schedule')) {
      return jsonFetchResponse({ ok: true, schedule: [] });
    }
    if (path.includes('/api/exec/reserve-policy')) {
      return jsonFetchResponse({ ok: true, policy: {} });
    }
    if (path.includes('/api/exec/summary')) {
      return jsonFetchResponse({ ok: true, counts: {}, productionMetrics: {}, branches: [] });
    }
    return jsonFetchResponse({ ok: false, error: 'Not found' }, 404);
  });
}

function cashierBootstrap() {
  return {
    ...bootstrapPayload(
      {
        id: 'u-cashier',
        username: 'cashier.user',
        displayName: 'Cashier User',
        roleKey: 'cashier',
        branchId: 'BR1',
      },
      ['cashier.desk.view', 'finance.pay', 'treasury.manage', 'receipts.post']
    ),
    treasuryAccounts: [{ id: 1, name: 'Main till', type: 'cash', balance: 1000, bankName: 'Cash' }],
    paymentRequests: [],
    refunds: [],
    registerSettlementsAwaitingPayment: [],
    poTransportAwaitingTreasury: [],
    poTransportMissingLink: [],
    poTransportCatchUp: [],
    orphanHaulageTreasuryMovements: [],
    staffRecoveriesDue: [],
    receipts: [],
  };
}

describe('authenticated startup TDZ', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', installFetchMock());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: bootstrapPayload(
          {
            id: 'u2',
            username: 'manager.user',
            displayName: 'Manager User',
            roleKey: 'sales_manager',
            branchId: 'BR1',
          },
          ['sales.view', 'manager.view', 'reports.view']
        ),
      })
    );
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

  it(
    'renders finance manager accounting desk without error boundary crash',
    async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: bootstrapPayload(
          {
            id: 'u-fm',
            username: 'finance.user',
            displayName: 'Finance User',
            roleKey: 'finance_manager',
            branchId: 'BR1',
          },
          ['finance.view', 'finance.post', 'period.manage']
        ),
      })
    );
    window.history.pushState({}, '', '/accounting');
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
        expect(screen.getByRole('tab', { name: /Home/i })).toBeInTheDocument();
      },
      { timeout: 45_000 }
    );
    },
    60_000
  );

  it('renders cashier finance accounts desk without error boundary crash', async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: cashierBootstrap(),
      })
    );
    window.history.pushState({}, '', '/accounts?tab=desk');
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
        expect(screen.getByRole('tab', { name: /^Finance desk$/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  });

  it('redirects cashier treasury deep link to merged My desk', async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: cashierBootstrap(),
      })
    );
    window.history.pushState({}, '', '/accounts?tab=treasury');
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
        expect(screen.getByRole('tab', { name: /^Finance desk$/i })).toBeInTheDocument();
        expect(screen.getByTestId('desk-treasury-summary')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
    expect(screen.queryByRole('tab', { name: /^Treasury$/i })).toBeNull();
    expect(screen.queryByTestId('cashier-treasury-desk-banner')).toBeNull();
    expect(screen.queryByTestId('finance-refunds-awaiting-payout')).toBeNull();
  });

  it('renders My HR overview without error boundary crash', async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: bootstrapPayload(
          {
            id: 'u-hr',
            username: 'staff.user',
            displayName: 'HR Staff',
            roleKey: 'operator',
            branchId: 'BR1',
          },
          ['hr.self', 'workspace.view']
        ),
      })
    );
    window.history.pushState({}, '', '/my-profile/overview');
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
        expect(screen.getByText(/At a glance/i)).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  });

  it('renders My HR loans page without error boundary crash', async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: bootstrapPayload(
          {
            id: 'u-hr',
            username: 'staff.user',
            displayName: 'HR Staff',
            roleKey: 'operator',
            branchId: 'BR1',
          },
          ['hr.self', 'workspace.view']
        ),
      })
    );
    window.history.pushState({}, '', '/my-profile/loans');
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
        expect(screen.getByRole('button', { name: /Apply for loan/i })).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  });

  it('renders CEO exec home without error boundary crash', async () => {
    vi.stubGlobal(
      'fetch',
      installFetchMock({
        bootstrap: bootstrapPayload(
          {
            id: 'u3',
            username: 'ceo.user',
            displayName: 'CEO User',
            roleKey: 'ceo',
            branchId: 'BR1',
          },
          ['exec.dashboard.view', 'dashboard.view', 'reports.view', 'office.use']
        ),
        execDashboard: CEO_EXEC_DASHBOARD,
      })
    );
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
