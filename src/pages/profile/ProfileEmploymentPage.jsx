import React from 'react';
import MyProfileEmployment from '../../pages/hr/MyProfileEmployment';
import { ProfileHrUpdateForm } from '../../components/profile/ProfileHrUpdateForm';

export default function ProfileEmploymentPage() {
  return (
    <div className="space-y-6">
      <MyProfileEmployment />
      <ProfileHrUpdateForm />
    </div>
  );
}
