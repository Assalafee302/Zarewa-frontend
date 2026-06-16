import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import MyLeave from '../hr/MyLeave';
import MyAttendance from '../hr/MyAttendance';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

export default function ProfileLeaveAttendance() {
  const { cohort } = useUserProfile();
  const showAttendance = cohort === 'employee';

  return (
    <div className="space-y-6">
      <ProfileOverviewSection
        title="Leave"
        subtitle="Apply for leave and track your requests"
      >
        <MyLeave staffLinkBase="/me" embedded />
      </ProfileOverviewSection>

      {showAttendance ? (
        <ProfileOverviewSection
          title="Attendance"
          subtitle="How your attendance is recorded and what to do if something is wrong"
        >
          <MyAttendance />
        </ProfileOverviewSection>
      ) : null}
    </div>
  );
}
