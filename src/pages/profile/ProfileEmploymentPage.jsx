import React from 'react';
import { MyProfileEmploymentSnapshot } from '../../pages/hr/MyProfileEmployment';
import { ProfileSelfServiceForm } from '../../components/profile/ProfileSelfServiceForm';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';
import { useUserProfile } from '../../context/UserProfileContext';

export default function ProfileEmploymentPage() {
  const { cohort } = useUserProfile();
  const showEmploymentRecord = cohort !== 'scholarship';

  return (
    <div className="space-y-6">
      <ProfileSelfServiceForm />
      <div id="hr-update-request">
        <ProfileHrUpdateForm />
      </div>
      {showEmploymentRecord ? <MyProfileEmploymentSnapshot /> : null}
    </div>
  );
}
