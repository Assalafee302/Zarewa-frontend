import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import { UserProfileProvider } from '../../context/UserProfileContext';
import { apiFetch } from '../../lib/apiBase';
import MyProfileOverview from './MyProfileOverview';
import MyProfileEmployment from './MyProfileEmployment';
import MyProfileDocuments from './MyProfileDocuments';
import MyProfileBenefits from './MyProfileBenefits';
import MyProfilePolicies from './MyProfilePolicies';
import MyProfileSurveys from './MyProfileSurveys';
import MyProfileGrievance from './MyProfileGrievance';
import MyProfileDiscipline from './MyProfileDiscipline';
import MyProfileSchool from './MyProfileSchool';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';
import MyPayslips from './MyPayslips';
import MyLoans from './MyLoans';

const MyIdCard = lazyWithRetry(() => import('./MyIdCard'), { id: 'MyIdCard' });

const EMPLOYEE_NAV_PRIMARY = [
  { to: '/my-profile/overview', label: 'Overview', end: true },
  { to: '/my-profile/leave', label: 'Leave' },
  { to: '/my-profile/payslips', label: 'Payslips' },
  { to: '/my-profile/employment', label: 'Employment' },
  { to: '/my-profile/documents', label: 'Documents' },
  { to: '/my-profile/loans', label: 'Loans' },
  { to: '/my-profile/policies', label: 'Policies' },
];

const EMPLOYEE_NAV_MORE = [
  { to: '/my-profile/attendance', label: 'Attendance' },
  { to: '/my-profile/id-card', label: 'ID Card' },
  { to: '/my-profile/benefits', label: 'Benefits' },
  { to: '/my-profile/discipline', label: 'Discipline' },
  { to: '/my-profile/surveys', label: 'Surveys' },
  { to: '/my-profile/grievance', label: 'Feedback' },
];

const SCHOLARSHIP_NAV = [
  { to: '/my-profile/school', label: 'My school', end: true },
  { to: '/my-profile/documents', label: 'Documents' },
  { to: '/my-profile/policies', label: 'Policies' },
  { to: '/my-profile/grievance', label: 'Feedback' },
];

const DOMESTIC_NAV = [
  { to: '/my-profile/overview', label: 'Overview', end: true },
  { to: '/my-profile/payslips', label: 'Payslips' },
  { to: '/my-profile/documents', label: 'Documents' },
  { to: '/my-profile/policies', label: 'Policies' },
];

function MyProfileLayout() {
  const [cohort, setCohort] = useState('employee');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/hr/me');
      if (cancelled || !ok || !data?.ok) return;
      if (data.hr?.isScholarshipBeneficiary) setCohort('scholarship');
      else if (data.hr?.isDomesticStaff) setCohort('domestic');
      else if (data.hr?.isNonBranchStaff) setCohort('special');
      else setCohort('employee');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = useMemo(() => {
    if (cohort === 'scholarship') return SCHOLARSHIP_NAV;
    if (cohort === 'domestic') return DOMESTIC_NAV;
    return EMPLOYEE_NAV_PRIMARY;
  }, [cohort]);

  const moreNavItems = cohort === 'employee' || cohort === 'special' ? EMPLOYEE_NAV_MORE : [];

  const subtitle =
    cohort === 'scholarship'
      ? 'Scholarship beneficiary — school fees, stipend step, and term dates. Account settings are under Account & security.'
      : cohort === 'domestic'
        ? 'Domestic staff — basic records and payslips. Account settings are under Account & security.'
        : 'HR self-service — leave, loans, payslips, and documents. Account and password are under Account & security.';

  return (
    <HrSectionShell
      title="My profile"
      subtitle={subtitle}
      navItems={navItems}
      moreNavItems={moreNavItems}
      stickySubnav
      compact
      outletContext={{ cohort }}
    />
  );
}

/** @returns {{ cohort?: string }} */
// eslint-disable-next-line react-refresh/only-export-components
export function useMyProfileCohort() {
  return useOutletContext() || {};
}

function MyProfileIndexRedirect() {
  const { cohort } = useMyProfileCohort();
  return <Navigate to={cohort === 'scholarship' ? 'school' : 'overview'} replace />;
}

export default function MyProfile() {
  return (
    <UserProfileProvider>
      <Routes>
        <Route element={<MyProfileLayout />}>
          <Route index element={<MyProfileIndexRedirect />} />
          <Route path="overview" element={<MyProfileOverview />} />
          <Route path="school" element={<MyProfileSchool />} />
          <Route path="employment" element={<MyProfileEmployment />} />
          <Route path="leave" element={<MyLeave staffLinkBase="/my-profile" />} />
          <Route path="loans" element={<MyLoans staffLinkBase="/my-profile" />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="payslips" element={<MyPayslips />} />
          <Route path="documents" element={<MyProfileDocuments />} />
          <Route
            path="id-card"
            element={
              <Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}>
                <MyIdCard />
              </Suspense>
            }
          />
          <Route path="benefits" element={<MyProfileBenefits />} />
          <Route path="policies" element={<MyProfilePolicies />} />
          <Route path="discipline" element={<MyProfileDiscipline />} />
          <Route path="surveys" element={<MyProfileSurveys />} />
          <Route path="grievance" element={<MyProfileGrievance />} />
          <Route path="help" element={<Navigate to="/my-profile/overview" replace />} />
        </Route>
      </Routes>
    </UserProfileProvider>
  );
}
