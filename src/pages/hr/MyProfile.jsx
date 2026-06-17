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

export default function MyProfile() {
  return (
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
  );
}
