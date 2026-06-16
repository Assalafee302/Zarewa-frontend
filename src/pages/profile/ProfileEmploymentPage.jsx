import React from 'react';
import { MyProfileEmploymentSnapshot } from '../../pages/hr/MyProfileEmployment';
import { ProfileSelfServiceForm } from '../../components/profile/ProfileSelfServiceForm';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';
import { useUserProfile } from '../../context/UserProfileContext';
import { ProfilePageAnchors } from '../../components/profile/profileFormUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';

const EMPLOYMENT_ANCHORS = [
  { id: 'personal-update', label: 'Personal' },
  { id: 'hr-request', label: 'HR request' },
  { id: 'snapshot', label: 'Record' },
];

export default function ProfileEmploymentPage() {
  const { cohort } = useUserProfile();
  const showEmploymentRecord = cohort !== 'scholarship';

  return (
    <div className="space-y-6">
      <ProfilePageAnchors items={EMPLOYMENT_ANCHORS} />

      <ProfileOverviewSection
        id="personal-update"
        title="Update personal details"
        subtitle="Phone, qualification, and other self-service fields"
      >
        <ProfileSelfServiceForm />
      </ProfileOverviewSection>

      <ProfileOverviewSection
        id="hr-request"
        title="Request HR update"
        subtitle="NIN, next of kin, bank account, and other changes that need approval"
      >
        <ProfileHrUpdateForm />
      </ProfileOverviewSection>

      {showEmploymentRecord ? (
        <ProfileOverviewSection id="snapshot" title="Your record" subtitle="Official employment data maintained by HR">
          <MyProfileEmploymentSnapshot />
        </ProfileOverviewSection>
      ) : null}
    </div>
  );
}
