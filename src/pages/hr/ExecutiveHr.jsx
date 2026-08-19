import React, { Suspense, useMemo } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
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
import { buildHrMainNav } from '../../lib/hrMainNav';
import { useWorkspace } from '../../context/WorkspaceContext';

const EXEC_AREAS = [
  { to: '/executive-hr/family', label: 'Family' },
  { to: '/executive-hr/compensation', label: 'Compensation' },
  { to: '/executive-hr/approvals', label: 'Approvals' },
  { to: '/executive-hr/reports', label: 'Reports' },
];

function ExecAreaSwitch() {
  return (
    <nav aria-label="Executive HR areas" className="flex flex-wrap gap-1.5">
      {EXEC_AREAS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `rounded-full px-3 py-1 text-xs font-semibold no-underline ${
              isActive
                ? 'bg-zarewa-teal text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-zarewa-teal'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ExecutiveShell() {
  const ws = useWorkspace();
  const { navItems, secondaryNavItems } = useMemo(
    () => buildHrMainNav(ws?.permissions || [], { showExecutive: true }),
    [ws?.permissions]
  );

  return (
    <HrSectionShell
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      moduleTitle="Human Resources"
      moduleSubtitle="People, time, pay, and records — in five places."
      stickySubnav
      compact
      afterNav={<ExecAreaSwitch />}
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
