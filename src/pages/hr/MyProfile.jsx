import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import HrPlaceholder from './HrPlaceholder';
import MyProfileOverview from './MyProfileOverview';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';

const NAV = [
  { to: '/my-profile/overview', label: 'Overview', end: true },
  { to: '/my-profile/employment', label: 'Employment' },
  { to: '/my-profile/leave', label: 'My leave' },
  { to: '/my-profile/loans', label: 'My loans' },
  { to: '/my-profile/attendance', label: 'Attendance' },
  { to: '/my-profile/payslips', label: 'Payslips' },
  { to: '/my-profile/documents', label: 'Documents' },
  { to: '/my-profile/benefits', label: 'Benefits' },
  { to: '/my-profile/policies', label: 'Policies' },
  { to: '/my-profile/help', label: 'Zare HR help' },
];

export default function MyProfile() {
  return (
    <Routes>
      <Route
        element={
          <HrSectionShell
            title="My profile"
            subtitle="Your employment record, leave, loans, payslips, and HR self-service."
            navItems={NAV}
          />
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<MyProfileOverview />} />
        <Route path="employment" element={<HrPlaceholder section="Employment details" />} />
        <Route path="leave" element={<MyLeave />} />
        <Route path="loans" element={<HrPlaceholder section="My loans" />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="payslips" element={<HrPlaceholder section="My payslips" detail="Unlock with your password to download payslip PDFs." />} />
        <Route path="documents" element={<HrPlaceholder section="My documents" />} />
        <Route path="benefits" element={<HrPlaceholder section="Benefits & allowances" />} />
        <Route path="policies" element={<HrPlaceholder section="Policies" detail="Handbook and IT security acknowledgements are recorded when you sign in." />} />
        <Route path="help" element={<HrPlaceholder section="Zare HR help" detail="Use the floating Zare assistant for leave balance and loan status questions." />} />
      </Route>
    </Routes>
  );
}
