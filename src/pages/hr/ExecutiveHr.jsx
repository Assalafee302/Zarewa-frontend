import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModuleRouteGuard from '../../components/ModuleRouteGuard';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import HrPlaceholder from './HrPlaceholder';
import ExecutiveHrContributions from './ExecutiveHrContributions';

const NAV = [
  { to: '/hr/executive/payroll', label: 'Payroll summary', end: true },
  { to: '/hr/executive/contributions', label: 'Branch contributions' },
  { to: '/hr/executive/exceptional-loans', label: 'Exceptional loans' },
  { to: '/hr/executive/salary-structure', label: 'Salary structure' },
  { to: '/hr/executive/special-changes', label: 'Special changes' },
  { to: '/hr/executive/variance', label: 'Payroll variance' },
  { to: '/hr/executive/approvals', label: 'Sensitive approvals' },
  { to: '/hr/executive/reports', label: 'HR reports' },
];

function ExecutiveShell() {
  return (
    <HrSectionShell
      title="Executive HR"
      subtitle="Managing Director view — branch salary contributions, exceptional loans, and sensitive payroll oversight."
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
          <Route path="payroll" element={<HrPlaceholder section="Payroll summary" detail="Use Human Resources → Payroll for run management." />} />
          <Route path="contributions" element={<ExecutiveHrContributions />} />
          <Route path="exceptional-loans" element={<HrPlaceholder section="Exceptional loans awaiting approval" />} />
          <Route path="salary-structure" element={<HrPlaceholder section="Salary structure approvals" />} />
          <Route path="special-changes" element={<HrPlaceholder section="Special salary changes" />} />
          <Route path="variance" element={<HrPlaceholder section="Payroll variance" />} />
          <Route path="approvals" element={<HrPlaceholder section="Sensitive approvals" />} />
          <Route path="reports" element={<HrPlaceholder section="Executive HR reports" />} />
        </Route>
      </Routes>
    </ModuleRouteGuard>
  );
}
