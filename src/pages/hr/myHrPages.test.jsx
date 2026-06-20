/**
 * Functional smoke tests for My HR self-service pages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(async (path) => {
    if (path === '/api/hr/me') {
      return {
        ok: true,
        data: {
          ok: true,
          user: { id: 'u-hr', displayName: 'Staff User' },
          hr: {
            jobTitle: 'Operator',
            dateJoinedIso: '2020-01-01',
            employmentType: 'permanent',
            baseSalaryNgn: 150000,
          },
          completeness: { sections: [{ id: 'employment', pct: 100 }] },
          documentSummary: { total: 1, verified: 1, pending: 0, rejected: 0 },
          pendingProfileRequests: [],
          loanPolicy: { loanMinServiceYears: 3, loanMaxSalaryMonths: 4, loanMaxRepaymentMonths: 12 },
          documents: [],
          unreadNotifications: 0,
        },
      };
    }
    if (path.startsWith('/api/hr/leave/balances')) {
      return { ok: true, data: { ok: true, balances: [{ leaveType: 'annual', closingDays: 10 }] } };
    }
    if (path.startsWith('/api/hr/payslips')) {
      return { ok: true, data: { ok: true, payslips: [], periodHint: null } };
    }
    if (path.startsWith('/api/hr/requests')) {
      return { ok: true, data: { ok: true, requests: [] } };
    }
    if (path.startsWith('/api/hr/me/attendance-summary')) {
      return { ok: true, data: { ok: true, absentDays: 0, lateDays: 0, deductionNgn: 0 } };
    }
    return { ok: false, data: { ok: false, error: 'Not mocked' } };
  }),
  apiUrl: (path) => path,
}));

vi.mock('../../lib/hrMasterData', () => ({
  fetchStaffLoanSchedule: vi.fn(async () => ({ ok: true, data: { ok: true, schedule: [] } })),
}));

vi.mock('../../lib/hrStaffObligations', () => ({
  fetchStaffMoneySummary: vi.fn(async () => ({
    ok: true,
    data: {
      ok: true,
      totalOutstandingNgn: 0,
      loans: [],
      purchases: [],
      recoveries: [],
      purchaseEligibility: { eligible: true, serviceYears: 4, issues: [] },
    },
  })),
}));

vi.mock('../../lib/hrStaffPurchaseCredit', () => ({
  fetchMyQuotationsForPurchaseCredit: vi.fn(async () => ({ ok: true, data: { ok: true, items: [] } })),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    session: { user: { id: 'u-hr', displayName: 'Staff User', branchId: 'BR1' } },
    permissions: ['hr.self'],
  }),
}));

vi.mock('../../hooks/useHrSensitiveAccess', () => ({
  useHrSensitiveAccess: () => ({
    isUnlocked: false,
    fetchWithSensitive: vi.fn(),
  }),
}));

const profileValue = {
  loading: false,
  initialLoading: false,
  error: '',
  me: { documents: [] },
  hr: { jobTitle: 'Operator', dateJoinedIso: '2020-01-01', employmentType: 'permanent' },
  user: { id: 'u-hr', displayName: 'Staff User' },
  cohort: 'employee',
  hasHrSelfService: true,
  reload: vi.fn(),
  completeness: { sections: [{ id: 'employment', pct: 100 }] },
  documentSummary: { rejected: 0, pending: 0 },
  pendingProfileRequests: [],
  loanPolicy: { loanMinServiceYears: 3, loanMaxSalaryMonths: 4, loanMaxRepaymentMonths: 12 },
  unreadNotifications: 0,
};

vi.mock('../../context/UserProfileContext', () => ({
  useUserProfile: () => profileValue,
}));

describe('My HR pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders MyProfileOverview without crashing', async () => {
    const { default: MyProfileOverview } = await import('./MyProfileOverview.jsx');
    render(
      <MemoryRouter initialEntries={['/my-profile/overview']}>
        <Routes>
          <Route path="/my-profile/overview" element={<MyProfileOverview />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/At a glance/i)).toBeInTheDocument();
    });
  });

  it('renders MyLoans without TDZ crash and shows staff loans tab', async () => {
    const { default: MyLoans } = await import('./MyLoans.jsx');
    render(
      <MemoryRouter initialEntries={['/my-profile/loans']}>
        <Routes>
          <Route path="/my-profile/loans" element={<MyLoans />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Apply for loan/i })).toBeInTheDocument();
      expect(screen.getByText(/Eligibility/i)).toBeInTheDocument();
    });
  });

  it('renders MyRequests with self-service panel', async () => {
    const { default: MyRequests } = await import('./MyRequests.jsx');
    render(
      <MemoryRouter initialEntries={['/my-profile/requests']}>
        <Routes>
          <Route path="/my-profile/requests" element={<MyRequests />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Apply for leave/i)).toBeInTheDocument();
    });
  });

  it('renders MyTimeOff with leave and attendance tabs', async () => {
    const { default: MyTimeOff } = await import('./MyTimeOff.jsx');
    render(
      <MemoryRouter initialEntries={['/my-profile/time-off?tab=leave']}>
        <Routes>
          <Route path="/my-profile/time-off" element={<MyTimeOff />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Apply for leave/i })).toBeInTheDocument();
    });
  });

  it('renders MyPayslips without crashing', async () => {
    const { default: MyPayslips } = await import('./MyPayslips.jsx');
    render(
      <MemoryRouter initialEntries={['/my-profile/payslips']}>
        <Routes>
          <Route path="/my-profile/payslips" element={<MyPayslips />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Payslip history/i)).toBeInTheDocument();
    });
  });
});
