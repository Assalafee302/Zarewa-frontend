import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModuleRouteGuard from '../../components/ModuleRouteGuard';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import ExecutiveHrFamilyHub from './ExecutiveHrFamilyHub';
import ExecutiveHrCompensationHub from './ExecutiveHrCompensationHub';
import ExecutiveHrApprovalsHub from './ExecutiveHrApprovalsHub';
import HrReports from './HrReports';
import {
  ExecutiveHrApprovalsLegacyRedirect,
  ExecutiveHrCompensationLegacyRedirect,
  ExecutiveHrFamilyLegacyRedirect,
} from './ExecutiveHrLegacyRedirects';
import { hrTabPath, HR_SETTINGS } from '../../lib/hrRoutes';

const NAV = [
  { to: '/executive-hr/family', label: 'Family & household' },
  { to: '/executive-hr/compensation', label: 'Compensation' },
  { to: '/executive-hr/approvals', label: 'Approvals' },
  { to: '/executive-hr/reports', label: 'Reports' },
  { to: hrTabPath(HR_SETTINGS, 'policies'), label: 'Leave & loan policy' },
];

function ExecutiveShell() {
  return (
    <HrSectionShell
      navItems={NAV}
      stickySubnav
      compact
    />
  );
}

export default function ExecutiveHr() {
  return (
    <ModuleRouteGuard moduleKey="executive_hr">
      <Routes>
        <Route element={<ExecutiveShell />}>
          <Route index element={<Navigate to="family" replace />} />
          <Route path="family" element={<ExecutiveHrFamilyHub />} />
          <Route path="compensation" element={<ExecutiveHrCompensationHub />} />
          <Route path="approvals" element={<ExecutiveHrApprovalsHub />} />
          <Route path="reports" element={<HrReports executive embedded />} />

          <Route path="family-dashboard" element={<ExecutiveHrFamilyLegacyRedirect segment="family-dashboard" />} />
          <Route path="domestic-dashboard" element={<ExecutiveHrFamilyLegacyRedirect segment="domestic-dashboard" />} />
          <Route path="benefits" element={<ExecutiveHrFamilyLegacyRedirect segment="benefits" />} />
          <Route path="chairman" element={<Navigate to="/executive-hr/family?tab=benefits" replace />} />
          <Route path="scholarship-requests" element={<ExecutiveHrFamilyLegacyRedirect segment="scholarship-requests" />} />

          <Route path="payroll" element={<ExecutiveHrCompensationLegacyRedirect segment="payroll" />} />
          <Route path="contributions" element={<ExecutiveHrCompensationLegacyRedirect segment="contributions" />} />
          <Route path="salary-structure" element={<ExecutiveHrCompensationLegacyRedirect segment="salary-structure" />} />
          <Route path="variance" element={<ExecutiveHrCompensationLegacyRedirect segment="variance" />} />
          <Route path="special-changes" element={<ExecutiveHrCompensationLegacyRedirect segment="special-changes" />} />

          <Route path="exceptional-loans" element={<ExecutiveHrApprovalsLegacyRedirect segment="exceptional-loans" />} />
          <Route path="approvals-legacy" element={<ExecutiveHrApprovalsLegacyRedirect segment="approvals" />} />

          <Route path="leave-policy" element={<Navigate to={hrTabPath(HR_SETTINGS, 'policies')} replace />} />
        </Route>
      </Routes>
    </ModuleRouteGuard>
  );
}
