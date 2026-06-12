import React from 'react';
import MyProfileEmployment from '../../pages/hr/MyProfileEmployment';
import { ProfileSelfServiceForm } from '../../components/profile/ProfileSelfServiceForm';
import { useUserProfile } from '../../context/UserProfileContext';

export default function ProfileEmploymentPage() {
  const { cohort } = useUserProfile();
  const showEmploymentRecord = cohort !== 'scholarship';

  return (
    <div className="space-y-6">
      <ProfileSelfServiceForm />
      {showEmploymentRecord ? <MyProfileEmployment /> : null}
    </div>
  );
}
