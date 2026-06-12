import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { UserProfileShell } from '../components/profile/UserProfileShell';
import { ProfileSectionGuard } from '../components/profile/ProfileSectionGuard';
import { ProfileSectionPage } from '../components/profile/ProfileSectionPage';
import ProfileOverview from './profile/ProfileOverview';
import ProfileAccount from './profile/ProfileAccount';
import ProfileActions from './profile/ProfileActions';
import ProfileLeaveAttendance from './profile/ProfileLeaveAttendance';
import ScholarshipSchoolProfile from '../components/hr/ScholarshipSchoolProfile';
import MyLoans from './hr/MyLoans';
import MyProfileDocuments from './hr/MyProfileDocuments';
import MyPayslips from './hr/MyPayslips';
import ProfileEmploymentPage from './profile/ProfileEmploymentPage';
import MyProfilePolicies from './hr/MyProfilePolicies';
import MyProfileGrievance from './hr/MyProfileGrievance';

const MyIdCard = lazyWithRetry(() => import('./hr/MyIdCard'), { id: 'MyIdCard' });

function SectionFallback() {
  return <p className="text-sm text-slate-600 py-6">Loading…</p>;
}

export default function UserProfile() {
  return (
    <Routes>
      <Route element={<UserProfileShell />}>
        <Route index element={<ProfileOverview />} />
        <Route
          path="account"
          element={
            <ProfileSectionPage title="Account & security" subtitle="Profile details, access info, and password.">
              <ProfileAccount />
            </ProfileSectionPage>
          }
        />
        <Route path="services" element={<ProfileActions />} />

        <Route
          path="school"
          element={
            <ProfileSectionGuard requireHr requireScholarship>
              <ProfileSectionPage title="My school" subtitle="Fees, stipend step, and term dates for your scholarship.">
                <ScholarshipSchoolProfile />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="leave"
          element={
            <ProfileSectionGuard requireHr requireNotScholarship>
              <ProfileSectionPage
                title="Leave & attendance"
                subtitle="Apply for leave, track requests, and view attendance guidance."
              >
                <ProfileLeaveAttendance />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="loans"
          element={
            <ProfileSectionGuard requireHr requireNotScholarship>
              <ProfileSectionPage title="Loans" subtitle="Apply for a staff loan and view your repayment schedule.">
                <MyLoans staffLinkBase="/me" />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="documents"
          element={
            <ProfileSectionGuard requireHr>
              <ProfileSectionPage title="Documents" subtitle="Upload and manage your personal HR documents.">
                <MyProfileDocuments />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="payslips"
          element={
            <ProfileSectionGuard requireHr>
              <ProfileSectionPage title="Payslips" subtitle="View and download your salary slips.">
                <MyPayslips />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="employment"
          element={
            <ProfileSectionGuard requireHr requireNotScholarship>
              <ProfileSectionPage title="Employment record" subtitle="Your job details and HR employment profile.">
                <ProfileEmploymentPage />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="policies"
          element={
            <ProfileSectionGuard requireHr>
              <ProfileSectionPage title="Policies" subtitle="Company handbook and policy acknowledgements.">
                <MyProfilePolicies />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="grievance"
          element={
            <ProfileSectionGuard requireHr requireNotScholarship>
              <ProfileSectionPage title="Feedback & grievance" subtitle="Raise feedback or submit a grievance.">
                <MyProfileGrievance />
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route
          path="id-card"
          element={
            <ProfileSectionGuard requireHr requireNotScholarship>
              <ProfileSectionPage title="Staff ID card" subtitle="View or print your staff identification card.">
                <Suspense fallback={<SectionFallback />}>
                  <MyIdCard />
                </Suspense>
              </ProfileSectionPage>
            </ProfileSectionGuard>
          }
        />

        <Route path="security" element={<Navigate to="/me/account#security" replace />} />
        <Route path="attendance" element={<Navigate to="/me/leave" replace />} />
        <Route path="actions" element={<Navigate to="/me/services" replace />} />
        <Route path="*" element={<Navigate to="/me" replace />} />
      </Route>
    </Routes>
  );
}
