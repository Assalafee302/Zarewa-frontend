import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import MyProfileOverview from './MyProfileOverview';
import MyProfileEmployment from './MyProfileEmployment';
import MyProfileDocuments from './MyProfileDocuments';
import MyProfileBenefits from './MyProfileBenefits';
import MyProfilePolicies from './MyProfilePolicies';
import MyProfileSurveys from './MyProfileSurveys';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';
import MyPayslips from './MyPayslips';
import MyLoans from './MyLoans';

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
        <Route path="employment" element={<MyProfileEmployment />} />
        <Route path="leave" element={<MyLeave />} />
        <Route path="loans" element={<MyLoans />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="payslips" element={<MyPayslips />} />
        <Route path="documents" element={<MyProfileDocuments />} />
        <Route path="benefits" element={<MyProfileBenefits />} />
        <Route path="policies" element={<MyProfilePolicies />} />
        <Route path="surveys" element={<MyProfileSurveys />} />
        <Route path="help" element={<MyProfileOverview />} />
      </Route>
    </Routes>
  );
}
