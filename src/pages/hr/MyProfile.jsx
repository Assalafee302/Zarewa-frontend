import React, { Suspense, useMemo } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom';
import { HrSectionShell } from '../../components/hr/HrSectionShell';
import { UserProfileProvider, useUserProfile } from '../../context/UserProfileContext';
import { ProfileHubSwitcher } from '../../components/profile/ProfileHubSwitcher';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { HrNotificationsPanel } from '../../components/hr/HrNotificationsPanel';
import MyProfileHome from './MyProfileHome';
import MyProfileOverview from './MyProfileOverview';
import MyProfileEmployment from './MyProfileEmployment';
import MyProfileDocuments from './MyProfileDocuments';
import MyProfileBenefits from './MyProfileBenefits';
import MyProfilePolicies from './MyProfilePolicies';
import MyProfileSurveys from './MyProfileSurveys';
import MyProfileGrievance from './MyProfileGrievance';
import MyProfileDiscipline from './MyProfileDiscipline';
import MyProfileSchool from './MyProfileSchool';
import MyProfileScholarshipPayments from './MyProfileScholarshipPayments';
import MyProfileDomesticPayments from './MyProfileDomesticPayments';
import MyProfileScholarshipRequests from './MyProfileScholarshipRequests';
import { ProfileMetricSkeleton } from '../../components/profile/profileOverviewUi';
import MyLeave from './MyLeave';
import MyAttendance from './MyAttendance';
import MyPayslips from './MyPayslips';
import MyLoans from './MyLoans';

const MyIdCard = lazyWithRetry(() => import('./MyIdCard'), { id: 'MyIdCard' });

const EMPLOYEE_NAV_PRIMARY = [
  { to: '/my-profile/overview', label: 'Overview', end: true },
  { to: '/my-profile/leave', label: 'Leave' },
  { to: '/my-profile/payslips', label: 'Payslips' },
  { to: '/my-profile/documents', label: 'Documents' },
  { to: '/my-profile/employment', label: 'Employment' },
  { to: '/my-profile/loans', label: 'Loans' },
];

const EMPLOYEE_NAV_MORE = [
  { to: '/my-profile/policies', label: 'Policies' },
  { to: '/my-profile/attendance', label: 'Attendance' },
  { to: '/my-profile/id-card', label: 'ID Card' },
  { to: '/my-profile/benefits', label: 'Benefits' },
  { to: '/my-profile/discipline', label: 'Discipline' },
  { to: '/my-profile/surveys', label: 'Surveys' },
  { to: '/my-profile/grievance', label: 'Feedback' },
];

const SCHOLARSHIP_NAV = [
  { to: '/my-profile/school', label: FAMILY_BENEFITS.navOverview, end: true },
  { to: '/my-profile/payments', label: FAMILY_BENEFITS.navPayments },
  { to: '/my-profile/requests', label: FAMILY_BENEFITS.navRequests },
  { to: '/my-profile/documents', label: FAMILY_BENEFITS.navDocuments },
  { to: '/my-profile/policies', label: FAMILY_BENEFITS.navPolicies },
  { to: '/my-profile/grievance', label: FAMILY_BENEFITS.navContact },
];

const DOMESTIC_NAV = [
  { to: '/my-profile/home', label: DOMESTIC_BENEFITS.navOverview, end: true },
  { to: '/my-profile/payments', label: DOMESTIC_BENEFITS.navPayments },
  { to: '/my-profile/documents', label: DOMESTIC_BENEFITS.navDocuments },
  { to: '/my-profile/policies', label: DOMESTIC_BENEFITS.navPolicies },
  { to: '/my-profile/grievance', label: DOMESTIC_BENEFITS.navContact },
];

function MyProfilePaymentsRoute() {
  const { cohort } = useMyProfileCohort();
  if (cohort === 'scholarship') return <MyProfileScholarshipPayments />;
  if (cohort === 'domestic') return <MyProfileDomesticPayments />;
  return <Navigate to="payslips" replace />;
}

function MyProfileLayout() {
  const { cohort } = useUserProfile();

  const navItems = useMemo(() => {
    if (cohort === 'scholarship') return SCHOLARSHIP_NAV;
    if (cohort === 'domestic') return DOMESTIC_NAV;
    return EMPLOYEE_NAV_PRIMARY;
  }, [cohort]);

  const moreNavItems = cohort === 'employee' || cohort === 'special' ? EMPLOYEE_NAV_MORE : [];

  const subtitle =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.hubSubtitle
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.hubSubtitle
        : 'HR self-service — leave, loans, payslips, and documents. Account and password are under Account & security.';

  const shellTitle =
    cohort === 'scholarship' ? FAMILY_BENEFITS.hubTitle : cohort === 'domestic' ? DOMESTIC_BENEFITS.hubTitle : 'My profile';

  const isExecutiveBenefitsHub = cohort === 'scholarship' || cohort === 'domestic';

  return (
    <HrSectionShell
      title={shellTitle}
      subtitle={subtitle}
      navItems={navItems}
      moreNavItems={moreNavItems}
      stickySubnav
      compact
      beforeNav={
        isExecutiveBenefitsHub ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <ProfileHubSwitcher />
            <HrNotificationsPanel compact />
          </div>
        ) : (
          <ProfileHubSwitcher />
        )
      }
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
  if (cohort === 'scholarship') return <Navigate to="school" replace />;
  if (cohort === 'domestic') return <Navigate to="home" replace />;
  return <Navigate to="overview" replace />;
}

export default function MyProfile() {
  return (
    <UserProfileProvider>
      <Routes>
        <Route element={<MyProfileLayout />}>
          <Route index element={<MyProfileIndexRedirect />} />
          <Route path="overview" element={<MyProfileOverview />} />
          <Route path="home" element={<MyProfileHome />} />
          <Route path="school" element={<MyProfileSchool />} />
          <Route path="payments" element={<MyProfilePaymentsRoute />} />
          <Route path="requests" element={<MyProfileScholarshipRequests />} />
          <Route path="employment" element={<MyProfileEmployment />} />
          <Route path="leave" element={<MyLeave staffLinkBase="/my-profile" />} />
          <Route path="loans" element={<MyLoans staffLinkBase="/my-profile" />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="payslips" element={<MyPayslips />} />
          <Route path="documents" element={<MyProfileDocuments />} />
          <Route
            path="id-card"
            element={
              <Suspense fallback={<ProfileMetricSkeleton count={1} />}>
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
