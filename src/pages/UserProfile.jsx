import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { UserProfileShell } from '../components/profile/UserProfileShell';
import { ProfileSectionPage } from '../components/profile/ProfileSectionPage';
import ProfileOverview from './profile/ProfileOverview';
import ProfileAccount from './profile/ProfileAccount';
import ProfileActions from './profile/ProfileActions';
import { ACCOUNT_PATH, HR_SELF_SERVICE_PATH } from '../lib/hrSelfServiceRoutes';

/** HR self-service lives under /my-profile — keep /me as account hub + redirects. */
function HrSelfServiceRedirect({ to }) {
  return <Navigate to={to} replace />;
}

export default function UserProfile() {
  return (
    <Routes>
      <Route element={<UserProfileShell />}>
        <Route index element={<ProfileOverview />} />
        <Route
          path="account"
          element={
            <ProfileSectionPage subtitle="Update profile, password, and review your access.">
              <ProfileAccount />
            </ProfileSectionPage>
          }
        />
        <Route path="services" element={<ProfileActions />} />

        <Route path="school" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.school} />} />
        <Route path="leave" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.leave} />} />
        <Route path="loans" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.loans} />} />
        <Route path="documents" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.documents} />} />
        <Route path="payslips" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.payslips} />} />
        <Route path="employment" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.employment} />} />
        <Route path="policies" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.policies} />} />
        <Route path="grievance" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.grievance} />} />
        <Route path="id-card" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.idCard} />} />
        <Route path="attendance" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.attendance} />} />
        <Route path="benefits" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.benefits} />} />
        <Route path="discipline" element={<HrSelfServiceRedirect to={HR_SELF_SERVICE_PATH.discipline} />} />

        <Route path="security" element={<Navigate to={`${ACCOUNT_PATH.account}#security`} replace />} />
        <Route path="actions" element={<Navigate to={ACCOUNT_PATH.services} replace />} />
        <Route path="*" element={<Navigate to={ACCOUNT_PATH.overview} replace />} />
      </Route>
    </Routes>
  );
}
