import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import HrTabRedirect from '../../components/hr/HrTabRedirect';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  HR_ATTENDANCE,
  HR_DEVELOPMENT,
  HR_DISCIPLINE_EXIT,
  HR_DOCUMENTS,
  HR_EMPLOYEES,
  HR_LEAVE,
  HR_PAYROLL,
  HR_RECRUITMENT,
  HR_SETTINGS,
} from '../../lib/hrRoutes';
import HrDashboard from './HrDashboard';
import HrEmployees from './HrEmployees';
import HrStaffProfile from './HrStaffProfile';
import HrRequests from './HrRequests';
import HrAttendanceHub from './HrAttendanceHub';
import HrLeaveHub from './HrLeaveHub';
import HrPayrollHub from './HrPayrollHub';
import HrRecruitmentHub from './HrRecruitmentHub';
import HrDevelopmentHub from './HrDevelopmentHub';
import HrDisciplineExitHub from './HrDisciplineExitHub';
import HrDocumentsHub from './HrDocumentsHub';
import HrSettingsHub from './HrSettingsHub';
import ExecutiveHr from './ExecutiveHr';

const HR_NAV = [
  { to: '/hr/dashboard', label: 'Dashboard', end: true },
  { to: '/hr/employees', label: 'Employees' },
  { to: '/hr/attendance', label: 'Attendance' },
  { to: '/hr/leave', label: 'Leave' },
  { to: '/hr/payroll', label: 'Payroll' },
  { to: '/hr/recruitment', label: 'Recruitment' },
  { to: '/hr/development', label: 'Development' },
  { to: '/hr/discipline-exit', label: 'Discipline & Exit' },
  { to: '/hr/documents', label: 'Documents' },
  { to: '/hr/settings', label: 'Settings' },
];

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

  const navItems = showExecutive
    ? [...HR_NAV, { to: '/hr/executive', label: 'Executive' }]
    : HR_NAV;

  return (
    <Routes>
      <Route
        element={
          <HrSectionShell
            title="Human Resources"
            subtitle="HQ payroll, staff records, leave, attendance, and people operations for Zarewa."
            navItems={navItems}
          />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HrDashboard />} />

        {/* Consolidated Phase 1 hubs */}
        <Route path="employees" element={<HrEmployees />} />
        <Route path="employees/:userId" element={<HrStaffProfile />} />
        <Route path="attendance" element={<HrAttendanceHub />} />
        <Route path="leave" element={<HrLeaveHub />} />
        <Route path="payroll" element={<HrPayrollHub />} />
        <Route path="recruitment" element={<HrRecruitmentHub />} />
        <Route path="development" element={<HrDevelopmentHub />} />
        <Route path="discipline-exit" element={<HrDisciplineExitHub />} />
        <Route path="documents" element={<HrDocumentsHub />} />
        <Route path="settings" element={<HrSettingsHub />} />

        {/* Requests — no nav item; linked from dashboard */}
        <Route path="requests" element={<HrRequests />} />

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
        <Route path="appraisal" element={<HrTabRedirect base={HR_DEVELOPMENT} tab="appraisals" />} />
        <Route path="analytics" element={<Navigate to="/hr/dashboard" replace />} />
        <Route path="id-cards" element={<HrTabRedirect base={HR_EMPLOYEES} tab="id-cards" />} />
        <Route path="chairman" element={<Navigate to="/hr/executive/chairman" replace />} />

        {/* Legacy standalone routes → hub equivalents */}
        <Route path="leave-legacy" element={<Navigate to={HR_LEAVE} replace />} />
        <Route path="attendance-legacy" element={<Navigate to={HR_ATTENDANCE} replace />} />
        <Route path="payroll-legacy" element={<Navigate to={HR_PAYROLL} replace />} />
        <Route path="settings-legacy" element={<Navigate to={HR_SETTINGS} replace />} />

        <Route path="executive/*" element={<ExecutiveHr />} />
      </Route>
    </Routes>
  );
}
