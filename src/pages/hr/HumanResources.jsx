import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import { useWorkspace } from '../../context/WorkspaceContext';
import HrDashboard from './HrDashboard';
import HrStaffDirectory from './HrStaffDirectory';
import HrStaffProfile from './HrStaffProfile';
import HrRequests from './HrRequests';
import HrLeave from './HrLeave';
import HrAttendance from './HrAttendance';
import HrPayroll from './HrPayroll';
import HrStaffRegister from './HrStaffRegister';
import HrTransfers from './HrTransfers';
import HrDiscipline from './HrDiscipline';
import HrLoans from './HrLoans';
import HrLetters from './HrLetters';
import HrBenefits from './HrBenefits';
import HrReports from './HrReports';
import HrSettings from './HrSettings';
import ExecutiveHr from './ExecutiveHr';

const HrChairmanAccounts = lazy(() => import('./HrChairmanAccounts'));
const HrIdCards = lazy(() => import('./HrIdCards'));
const HrPayeTaxPension = lazy(() => import('./HrPayeTaxPension'));
const HrAppraisal = lazy(() => import('./HrAppraisal'));
const HrAnalytics = lazy(() => import('./HrAnalytics'));

const HR_NAV = [
  { to: '/hr/dashboard', label: 'Dashboard', end: true },
  { to: '/hr/staff', label: 'Staff' },
  { to: '/hr/requests', label: 'Requests' },
  { to: '/hr/leave', label: 'Leave' },
  { to: '/hr/attendance', label: 'Attendance' },
  { to: '/hr/payroll', label: 'Payroll' },
  { to: '/hr/loans', label: 'Loans' },
  { to: '/hr/benefits', label: 'Benefits' },
  { to: '/hr/transfers', label: 'Transfers' },
  { to: '/hr/discipline', label: 'Discipline' },
  { to: '/hr/letters', label: 'Letters' },
  { to: '/hr/tax-pension', label: 'Tax & Pension' },
  { to: '/hr/id-cards', label: 'ID Cards' },
  { to: '/hr/chairman', label: 'Chairman Accounts' },
  { to: '/hr/appraisal', label: 'Appraisals' },
  { to: '/hr/analytics', label: 'Analytics' },
  { to: '/hr/reports', label: 'Reports' },
  { to: '/hr/settings', label: 'Settings' },
];

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
        <Route path="staff" element={<HrStaffDirectory />} />
        <Route path="staff/register" element={<HrStaffRegister />} />
        <Route path="staff/:userId" element={<HrStaffProfile />} />
        <Route path="requests" element={<HrRequests />} />
        <Route path="leave" element={<HrLeave />} />
        <Route path="attendance" element={<HrAttendance />} />
        <Route path="payroll" element={<HrPayroll />} />
        <Route path="loans" element={<HrLoans />} />
        <Route path="benefits" element={<HrBenefits />} />
        <Route path="transfers" element={<HrTransfers />} />
        <Route path="discipline" element={<HrDiscipline />} />
        <Route path="letters" element={<HrLetters />} />
        <Route path="reports" element={<HrReports />} />
        <Route path="settings" element={<HrSettings />} />
        <Route path="tax-pension" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}><HrPayeTaxPension /></Suspense>} />
        <Route path="chairman" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}><HrChairmanAccounts /></Suspense>} />
        <Route path="id-cards" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}><HrIdCards /></Suspense>} />
        <Route path="appraisal" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}><HrAppraisal /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}><HrAnalytics /></Suspense>} />
        <Route path="executive/*" element={<ExecutiveHr />} />
      </Route>
    </Routes>
  );
}
