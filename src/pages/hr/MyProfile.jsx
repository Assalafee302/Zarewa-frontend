import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom';
import { ProfileSectionShell } from '../../components/profile/ProfileSectionShell';
import { useUserProfile } from '../../context/UserProfileContext';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
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

function MyProfilePaymentsRoute() {
  const { cohort } = useMyProfileCohort();
  if (cohort === 'scholarship') return <MyProfileScholarshipPayments />;
  if (cohort === 'domestic') return <MyProfileDomesticPayments />;
  return <Navigate to="payslips" replace />;
}

function MyProfileLayout() {
  const { cohort } = useUserProfile();

  const subtitle =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.hubSubtitle
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.hubSubtitle
        : 'Leave, pay, documents, and employment records.';

  const shellTitle =
    cohort === 'scholarship'
      ? FAMILY_BENEFITS.hubTitle
      : cohort === 'domestic'
        ? DOMESTIC_BENEFITS.hubTitle
        : 'HR services';

  return (
    <ProfileSectionShell
      title={shellTitle}
      subtitle={subtitle}
      cohort={cohort}
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

function MyProfileCohortRoute({ cohort: required, redirectTo, children }) {
  const { cohort } = useMyProfileCohort();
  if (cohort !== required) return <Navigate to={redirectTo} replace />;
  return children;
}

function MyProfileEmployeeRoute({ children }) {
  const { cohort } = useMyProfileCohort();
  if (cohort === 'scholarship') return <Navigate to="/my-profile/school" replace />;
  if (cohort === 'domestic') return <Navigate to="/my-profile/home" replace />;
  return children;
}

export default function MyProfile() {
  return (
    <Routes>
        <Route element={<MyProfileLayout />}>
          <Route index element={<MyProfileIndexRedirect />} />
          <Route path="overview" element={<MyProfileEmployeeRoute><MyProfileOverview /></MyProfileEmployeeRoute>} />
          <Route path="home" element={<MyProfileCohortRoute cohort="domestic" redirectTo="/my-profile/overview"><MyProfileHome /></MyProfileCohortRoute>} />
          <Route path="school" element={<MyProfileCohortRoute cohort="scholarship" redirectTo="/my-profile/overview"><MyProfileSchool /></MyProfileCohortRoute>} />
          <Route path="payments" element={<MyProfilePaymentsRoute />} />
          <Route path="requests" element={<MyProfileCohortRoute cohort="scholarship" redirectTo="/my-profile/overview"><MyProfileScholarshipRequests /></MyProfileCohortRoute>} />
          <Route path="employment" element={<MyProfileEmployeeRoute><MyProfileEmployment /></MyProfileEmployeeRoute>} />
          <Route path="leave" element={<MyProfileEmployeeRoute><MyLeave staffLinkBase="/my-profile" /></MyProfileEmployeeRoute>} />
          <Route path="loans" element={<MyProfileEmployeeRoute><MyLoans staffLinkBase="/my-profile" /></MyProfileEmployeeRoute>} />
          <Route path="attendance" element={<MyProfileEmployeeRoute><MyAttendance /></MyProfileEmployeeRoute>} />
          <Route path="payslips" element={<MyProfileEmployeeRoute><MyPayslips /></MyProfileEmployeeRoute>} />
          <Route path="documents" element={<MyProfileDocuments />} />
          <Route
            path="id-card"
            element={
              <MyProfileEmployeeRoute>
                <Suspense fallback={<ProfileMetricSkeleton count={1} />}>
                  <MyIdCard />
                </Suspense>
              </MyProfileEmployeeRoute>
            }
          />
          <Route path="benefits" element={<MyProfileEmployeeRoute><MyProfileBenefits /></MyProfileEmployeeRoute>} />
          <Route path="policies" element={<MyProfilePolicies />} />
          <Route path="discipline" element={<MyProfileEmployeeRoute><MyProfileDiscipline /></MyProfileEmployeeRoute>} />
          <Route path="surveys" element={<MyProfileEmployeeRoute><MyProfileSurveys /></MyProfileEmployeeRoute>} />
          <Route path="grievance" element={<MyProfileGrievance />} />
          <Route path="help" element={<Navigate to="/my-profile/overview" replace />} />
        </Route>
      </Routes>
  );
}
