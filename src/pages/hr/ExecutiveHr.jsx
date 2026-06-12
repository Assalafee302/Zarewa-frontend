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
import ExecutiveHrLeavePolicy from './ExecutiveHrLeavePolicy';
import HrReports from './HrReports';

const HrExecutiveBenefitsHub = lazyWithRetry(() => import('./HrChairmanAccounts'), { id: 'HrChairmanAccounts' });

const NAV = [
  { to: '/executive-hr/payroll', label: 'Payroll summary', end: true },
  { to: '/executive-hr/contributions', label: 'Branch contributions' },
  { to: '/executive-hr/exceptional-loans', label: 'Exceptional loans' },
  { to: '/executive-hr/salary-structure', label: 'Salary structure' },
  { to: '/executive-hr/special-changes', label: 'Special changes' },
  { to: '/executive-hr/variance', label: 'Payroll variance' },
  { to: '/executive-hr/approvals', label: 'Sensitive approvals' },
  { to: '/executive-hr/benefits', label: 'Executive benefits' },
  { to: '/executive-hr/leave-policy', label: 'Leave policy' },
  { to: '/executive-hr/reports', label: 'HR reports' },
];

function ExecutiveShell() {
  return (
    <HrSectionShell
      title="Executive HR"
      subtitle="Managing Director view — branch salary contributions, executive benefits, and sensitive payroll oversight."
      navItems={NAV}
    />
  );
}

export default function ExecutiveHr() {
  return (
    <ModuleRouteGuard moduleKey="executive_hr">
      <Routes>
        <Route element={<ExecutiveShell />}>
          <Route index element={<Navigate to="payroll" replace />} />
          <Route path="payroll" element={<ExecutiveHrPayrollSummary />} />
          <Route path="contributions" element={<ExecutiveHrContributions />} />
          <Route path="exceptional-loans" element={<ExecutiveHrExceptionalLoans />} />
          <Route path="salary-structure" element={<ExecutiveHrSalaryStructure />} />
          <Route path="special-changes" element={<ExecutiveHrSpecialChanges />} />
          <Route path="variance" element={<ExecutiveHrVariance />} />
          <Route path="approvals" element={<ExecutiveHrApprovals />} />
          <Route
            path="benefits"
            element={
              <Suspense fallback={<p className="text-sm text-slate-600">Loading executive benefits…</p>}>
                <HrExecutiveBenefitsHub embedded />
              </Suspense>
            }
          />
          <Route path="chairman" element={<Navigate to="/executive-hr/benefits" replace />} />
          <Route path="leave-policy" element={<ExecutiveHrLeavePolicy />} />
          <Route path="reports" element={<HrReports executive embedded />} />
        </Route>
      </Routes>
    </ModuleRouteGuard>
  );
}
