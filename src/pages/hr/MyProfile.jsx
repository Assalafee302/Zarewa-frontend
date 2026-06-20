import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfileSectionShell } from '../../components/profile/ProfileSectionShell';
import { useUserProfile } from '../../context/UserProfileContext';
import { ProfileMetricSkeleton } from '../../components/profile/profileOverviewUi';
import { useMyProfileCohort } from './useMyProfileCohort';

const MyProfileHome = lazyWithRetry(() => import('./MyProfileHome'), { id: 'MyProfileHome' });
const MyProfileOverview = lazyWithRetry(() => import('./MyProfileOverview'), { id: 'MyProfileOverview' });
const MyProfileEmployment = lazyWithRetry(() => import('./MyProfileEmployment'), { id: 'MyProfileEmployment' });
const MyProfileDocuments = lazyWithRetry(() => import('./MyProfileDocuments'), { id: 'MyProfileDocuments' });
const MyProfileBenefits = lazyWithRetry(() => import('./MyProfileBenefits'), { id: 'MyProfileBenefits' });
const MyProfilePolicies = lazyWithRetry(() => import('./MyProfilePolicies'), { id: 'MyProfilePolicies' });
const MyProfileSurveys = lazyWithRetry(() => import('./MyProfileSurveys'), { id: 'MyProfileSurveys' });
const MyProfileGrievance = lazyWithRetry(() => import('./MyProfileGrievance'), { id: 'MyProfileGrievance' });
const MyProfileDiscipline = lazyWithRetry(() => import('./MyProfileDiscipline'), { id: 'MyProfileDiscipline' });
const MyProfileSchool = lazyWithRetry(() => import('./MyProfileSchool'), { id: 'MyProfileSchool' });
const MyProfileScholarshipPayments = lazyWithRetry(() => import('./MyProfileScholarshipPayments'), {
  id: 'MyProfileScholarshipPayments',
});
const MyProfileDomesticPayments = lazyWithRetry(() => import('./MyProfileDomesticPayments'), {
  id: 'MyProfileDomesticPayments',
});
const MyProfileScholarshipRequests = lazyWithRetry(() => import('./MyProfileScholarshipRequests'), {
  id: 'MyProfileScholarshipRequests',
});
const MyRequests = lazyWithRetry(() => import('./MyRequests'), { id: 'MyRequests' });
const MyTimeOff = lazyWithRetry(() => import('./MyTimeOff'), { id: 'MyTimeOff' });
const MyPayslips = lazyWithRetry(() => import('./MyPayslips'), { id: 'MyPayslips' });
const MyLoans = lazyWithRetry(() => import('./MyLoans'), { id: 'MyLoans' });
const MyIdCard = lazyWithRetry(() => import('./MyIdCard'), { id: 'MyIdCard' });

function ProfileTabFallback() {
  return <ProfileMetricSkeleton count={1} />;
}

function ProfileTab({ children }) {
  return <Suspense fallback={<ProfileTabFallback />}>{children}</Suspense>;
}

function MyProfilePaymentsRoute() {
  const { cohort } = useMyProfileCohort();
  if (cohort === 'scholarship') {
    return (
      <ProfileTab>
        <MyProfileScholarshipPayments />
      </ProfileTab>
    );
  }
  if (cohort === 'domestic') {
    return (
      <ProfileTab>
        <MyProfileDomesticPayments />
      </ProfileTab>
    );
  }
  return <Navigate to="payslips" replace />;
}

function MyProfileLayout() {
  const { cohort } = useUserProfile();

  return <ProfileSectionShell cohort={cohort} outletContext={{ cohort }} />;
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

function MyProfileRequestsRoute() {
  const { cohort } = useMyProfileCohort();
  if (cohort === 'scholarship') {
    return (
      <ProfileTab>
        <MyProfileScholarshipRequests />
      </ProfileTab>
    );
  }
  if (cohort === 'domestic') return <Navigate to="/my-profile/home" replace />;
  return (
    <ProfileTab>
      <MyRequests />
    </ProfileTab>
  );
}

export default function MyProfile() {
  return (
    <Routes>
      <Route element={<MyProfileLayout />}>
        <Route index element={<MyProfileIndexRedirect />} />
        <Route
          path="overview"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyProfileOverview />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="home"
          element={
            <MyProfileCohortRoute cohort="domestic" redirectTo="/my-profile/overview">
              <ProfileTab>
                <MyProfileHome />
              </ProfileTab>
            </MyProfileCohortRoute>
          }
        />
        <Route
          path="school"
          element={
            <MyProfileCohortRoute cohort="scholarship" redirectTo="/my-profile/overview">
              <ProfileTab>
                <MyProfileSchool />
              </ProfileTab>
            </MyProfileCohortRoute>
          }
        />
        <Route path="payments" element={<MyProfilePaymentsRoute />} />
        <Route path="requests" element={<MyProfileRequestsRoute />} />
        <Route
          path="employment"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyProfileEmployment />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="time-off"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyTimeOff />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route path="leave" element={<Navigate to="/my-profile/time-off?tab=leave" replace />} />
        <Route path="attendance" element={<Navigate to="/my-profile/time-off?tab=attendance" replace />} />
        <Route
          path="loans"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyLoans staffLinkBase="/my-profile" />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="payslips"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyPayslips />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="documents"
          element={
            <ProfileTab>
              <MyProfileDocuments />
            </ProfileTab>
          }
        />
        <Route
          path="id-card"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyIdCard />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="benefits"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyProfileBenefits />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="policies"
          element={
            <ProfileTab>
              <MyProfilePolicies />
            </ProfileTab>
          }
        />
        <Route
          path="discipline"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyProfileDiscipline />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="surveys"
          element={
            <MyProfileEmployeeRoute>
              <ProfileTab>
                <MyProfileSurveys />
              </ProfileTab>
            </MyProfileEmployeeRoute>
          }
        />
        <Route
          path="grievance"
          element={
            <ProfileTab>
              <MyProfileGrievance />
            </ProfileTab>
          }
        />
        <Route path="help" element={<Navigate to="/my-profile/overview" replace />} />
      </Route>
    </Routes>
  );
}
