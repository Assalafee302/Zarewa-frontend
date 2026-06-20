import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModuleRouteGuard from '../../components/ModuleRouteGuard';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import ExecutiveHrContributions from './ExecutiveHrContributions';
import ExecutiveHrPayrollSummary from './ExecutiveHrPayrollSummary';
import ExecutiveHrExceptionalLoans from './ExecutiveHrExceptionalLoans';
import ExecutiveHrSalaryStructure from './ExecutiveHrSalaryStructure';
import ExecutiveHrSpecialChanges from './ExecutiveHrSpecialChanges';
import ExecutiveHrVariance from './ExecutiveHrVariance';
import ExecutiveHrApprovals from './ExecutiveHrApprovals';
import ExecutiveHrScholarshipRequests from './ExecutiveHrScholarshipRequests';
import ExecutiveHrFamilyDashboard from './ExecutiveHrFamilyDashboard';
import ExecutiveHrDomesticDashboard from './ExecutiveHrDomesticDashboard';
import HrReports from './HrReports';
import { hrTabPath, HR_EMPLOYEE_REGISTERS, HR_SETTINGS } from '../../lib/hrRoutes';
const HrExecutiveBenefitsHub = lazyWithRetry(() => import('./HrChairmanAccounts'), { id: 'HrChairmanAccounts' });

const NAV = [
  { to: '/executive-hr/family-dashboard', label: 'Family overview' },
  { to: '/executive-hr/domestic-dashboard', label: 'Household staff overview' },
  { to: '/executive-hr/benefits', label: 'Executive benefits', end: true },
  { to: `${HR_EMPLOYEE_REGISTERS}?tab=scholarship`, label: 'Executive family register' },
  { to: `${HR_EMPLOYEE_REGISTERS}?tab=domestic`, label: 'Household staff (optional ERP)' },
  { to: '/executive-hr/scholarship-requests', label: 'Family benefit requests' },
  { to: '/executive-hr/payroll', label: 'Payroll summary' },
  { to: '/executive-hr/contributions', label: 'Branch contributions' },
  { to: '/executive-hr/exceptional-loans', label: 'Exceptional loans' },
  { to: '/executive-hr/salary-structure', label: 'Salary structure' },
  { to: '/executive-hr/special-changes', label: 'Special changes' },
  { to: '/executive-hr/variance', label: 'Payroll variance' },
  { to: '/executive-hr/approvals', label: 'Sensitive approvals' },
  { to: hrTabPath(HR_SETTINGS, 'policies'), label: 'Leave & loan policy' },
  { to: '/executive-hr/reports', label: 'HR reports' },
];

function ExecutiveShell() {
  return (
    <HrSectionShell
      title="Executive HR"
      subtitle="CEO and Chairman view — family overview, household staff, school fees, monthly allowance, and Executive benefits."
      navItems={NAV}
    />
  );
}

export default function ExecutiveHr() {
  return (
    <ModuleRouteGuard moduleKey="executive_hr">
      <Routes>
        <Route element={<ExecutiveShell />}>
          <Route index element={<Navigate to="family-dashboard" replace />} />
          <Route path="payroll" element={<ExecutiveHrPayrollSummary />} />
          <Route path="contributions" element={<ExecutiveHrContributions />} />
          <Route path="exceptional-loans" element={<ExecutiveHrExceptionalLoans />} />
          <Route path="salary-structure" element={<ExecutiveHrSalaryStructure />} />
          <Route path="special-changes" element={<ExecutiveHrSpecialChanges />} />
          <Route path="variance" element={<ExecutiveHrVariance />} />
          <Route path="approvals" element={<ExecutiveHrApprovals />} />
          <Route path="family-dashboard" element={<ExecutiveHrFamilyDashboard />} />
          <Route path="domestic-dashboard" element={<ExecutiveHrDomesticDashboard />} />
          <Route
            path="benefits"
            element={
              <Suspense fallback={<p className="text-sm text-slate-600">Loading executive benefits…</p>}>
                <HrExecutiveBenefitsHub embedded />
              </Suspense>
            }
          />
          <Route path="chairman" element={<Navigate to="/executive-hr/benefits" replace />} />
          <Route path="scholarship-requests" element={<ExecutiveHrScholarshipRequests />} />
          <Route path="leave-policy" element={<Navigate to={hrTabPath(HR_SETTINGS, 'policies')} replace />} />
          <Route path="reports" element={<HrReports executive embedded />} />        </Route>
      </Routes>
    </ModuleRouteGuard>
  );
}
