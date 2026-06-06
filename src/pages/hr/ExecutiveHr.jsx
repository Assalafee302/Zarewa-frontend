import React, { lazy, Suspense } from 'react';
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
import HrReports from './HrReports';

const HrChairmanAccounts = lazy(() => import('./HrChairmanAccounts'));

const NAV = [
  { to: '/hr/executive/payroll', label: 'Payroll summary', end: true },
  { to: '/hr/executive/contributions', label: 'Branch contributions' },
  { to: '/hr/executive/exceptional-loans', label: 'Exceptional loans' },
  { to: '/hr/executive/salary-structure', label: 'Salary structure' },
  { to: '/hr/executive/special-changes', label: 'Special changes' },
  { to: '/hr/executive/variance', label: 'Payroll variance' },
  { to: '/hr/executive/approvals', label: 'Sensitive approvals' },
  { to: '/hr/executive/chairman', label: 'Chairman accounts' },
  { to: '/hr/executive/reports', label: 'HR reports' },
];

function ExecutiveShell() {
  return (
    <HrSectionShell
      title="Executive HR"
      subtitle="Managing Director view — branch salary contributions, exceptional loans, chairman accounts, and sensitive payroll oversight."
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
            path="chairman"
            element={
              <Suspense fallback={<p className="text-sm text-slate-600">Loading chairman accounts…</p>}>
                <HrChairmanAccounts embedded />
              </Suspense>
            }
          />
          <Route path="reports" element={<HrReports executive embedded />} />
        </Route>
      </Routes>
    </ModuleRouteGuard>
  );
}
