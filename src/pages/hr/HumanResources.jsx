import React, { Suspense, useMemo } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import HrTabRedirect from '../../components/hr/HrTabRedirect';
import { useWorkspace } from '../../context/WorkspaceContext';
import { buildHrMainNav } from '../../lib/hrMainNav';
import {
  HR_DISCIPLINE_EXIT,
  HR_DOCUMENTS,
  HR_EMPLOYEES,
  HR_PAYROLL,
  HR_SETTINGS,
  HR_TIME_ABSENCE,
} from '../../lib/hrRoutes';
import HrDashboard from './HrDashboard';
import HrEmployees from './HrEmployees';
import HrStaffRegisters from './HrStaffRegisters';
import HrStaffProfile from './HrStaffProfile';
import { HrAttendanceLegacyRedirect, HrLeaveLegacyRedirect, HrRequestsLegacyRedirect } from './HrLegacyHrRedirects';
import HrTimeAbsenceHub from './HrTimeAbsenceHub';
import HrPayrollHub from './HrPayrollHub';
import HrTalentHub from './HrTalentHub';
import { HrDevelopmentLegacyRedirect, HrRecruitmentLegacyRedirect } from './HrTalentLegacyRedirects';
import HrDisciplineExitHub from './HrDisciplineExitHub';
import HrDocumentsHub from './HrDocumentsHub';
import HrSettingsHub from './HrSettingsHub';

const HrAnalytics = lazyWithRetry(() => import('./HrAnalytics'), { id: 'HrAnalytics' });

function LegacyStaffProfileRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/hr/employees/${encodeURIComponent(userId || '')}`} replace />;
}

function LegacyStaffRegisterRedirect() {
  return <Navigate to="/hr/employees?tab=directory&register=1" replace />;
}

export default function HumanResources() {
  const ws = useWorkspace();
  const showExecutive = ws?.canAccessModule?.('executive_hr');
  const { navItems, moreNavItems } = useMemo(
    () => buildHrMainNav(ws?.permissions || [], { showExecutive }),
    [ws?.permissions, showExecutive]
  );

  return (
    <Routes>
      <Route
        element={
          <HrSectionShell
            navItems={navItems}
            moreNavItems={moreNavItems}
            stickySubnav
            compact
          />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HrDashboard />} />

        {/* Consolidated Phase 1 hubs */}
        <Route path="employees" element={<HrEmployees />} />
        <Route path="employees/registers" element={<HrStaffRegisters />} />
        <Route path="employees/:userId" element={<HrStaffProfile />} />
        <Route path="time-absence" element={<HrTimeAbsenceHub />} />
        <Route path="attendance" element={<HrAttendanceLegacyRedirect />} />
        <Route path="leave" element={<HrLeaveLegacyRedirect />} />
        <Route path="requests" element={<HrRequestsLegacyRedirect />} />
        <Route path="payroll" element={<HrPayrollHub />} />
        <Route path="talent" element={<HrTalentHub />} />
        <Route path="recruitment" element={<HrRecruitmentLegacyRedirect />} />
        <Route path="development" element={<HrDevelopmentLegacyRedirect />} />
        <Route path="discipline-exit" element={<HrDisciplineExitHub />} />
        <Route path="documents" element={<HrDocumentsHub />} />
        <Route path="settings" element={<HrSettingsHub />} />

        {/* Legacy redirects */}
        <Route path="staff" element={<Navigate to="/hr/employees" replace />} />
        <Route path="staff/register" element={<LegacyStaffRegisterRedirect />} />
        <Route path="staff/:userId" element={<LegacyStaffProfileRedirect />} />
        <Route path="loans" element={<HrTabRedirect base={HR_PAYROLL} tab="loans" />} />
        <Route path="benefits" element={<HrTabRedirect base={HR_PAYROLL} tab="benefits" />} />
        <Route path="tax-pension" element={<HrTabRedirect base={HR_PAYROLL} tab="tax-pension" />} />
        <Route path="transfers" element={<HrTabRedirect base={HR_DISCIPLINE_EXIT} tab="transfers" />} />
        <Route path="discipline" element={<Navigate to={HR_DISCIPLINE_EXIT} replace />} />
        <Route path="letters" element={<HrTabRedirect base={HR_DOCUMENTS} tab="letters" />} />
        <Route path="reports" element={<HrTabRedirect base={HR_DOCUMENTS} tab="reports" />} />
        <Route path="appraisal" element={<Navigate to="/hr/talent?tab=develop&section=appraisals" replace />} />
        <Route path="analytics" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading analytics…</p>}><HrAnalytics /></Suspense>} />
        <Route path="id-cards" element={<HrTabRedirect base={HR_DOCUMENTS} tab="id-cards" />} />
        <Route path="chairman" element={<Navigate to="/executive-hr/family?tab=benefits" replace />} />
        <Route path="engagement" element={<Navigate to="/hr/talent?tab=develop&section=engagement" replace />} />
        <Route path="learning" element={<Navigate to="/hr/talent?tab=develop&section=training" replace />} />
        <Route path="recruiting" element={<Navigate to="/hr/talent?tab=recruit" replace />} />
        <Route path="executive/*" element={<Navigate to="/executive-hr" replace />} />
        <Route path="*" element={<Navigate to="/hr/dashboard" replace />} />

        {/* Legacy standalone routes → hub equivalents */}
        <Route path="leave-legacy" element={<Navigate to={HR_TIME_ABSENCE} replace />} />
        <Route path="attendance-legacy" element={<Navigate to={HR_TIME_ABSENCE} replace />} />
        <Route path="payroll-legacy" element={<Navigate to={HR_PAYROLL} replace />} />
        <Route path="settings-legacy" element={<Navigate to={HR_SETTINGS} replace />} />
      </Route>
    </Routes>
  );
}
