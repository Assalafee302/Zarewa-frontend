import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import { useWorkspace } from '../../context/WorkspaceContext';
import HrDashboard from './HrDashboard';
import HrPlaceholder from './HrPlaceholder';
import ExecutiveHr from './ExecutiveHr';

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
        <Route path="staff" element={<HrPlaceholder section="Staff directory" />} />
        <Route path="requests" element={<HrPlaceholder section="HR requests" />} />
        <Route path="leave" element={<HrPlaceholder section="Leave" />} />
        <Route path="attendance" element={<HrPlaceholder section="Attendance" />} />
        <Route path="payroll" element={<HrPlaceholder section="Payroll" detail="Payroll runs, GMHR approval, and finance payout connect here. Use password unlock for line amounts." />} />
        <Route path="loans" element={<HrPlaceholder section="Staff loans" />} />
        <Route path="benefits" element={<HrPlaceholder section="Benefits & allowances" />} />
        <Route path="transfers" element={<HrPlaceholder section="Transfers" />} />
        <Route path="discipline" element={<HrPlaceholder section="Discipline" />} />
        <Route path="letters" element={<HrPlaceholder section="Letters & documents" />} />
        <Route path="reports" element={<HrPlaceholder section="HR reports" />} />
        <Route path="settings" element={<HrPlaceholder section="HR settings" />} />
        <Route path="executive/*" element={<ExecutiveHr />} />
      </Route>
    </Routes>
  );
}
