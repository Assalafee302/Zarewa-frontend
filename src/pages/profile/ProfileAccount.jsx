import React from 'react';
import SettingsProfilePanel from '../../components/settings/SettingsProfilePanel';
import ProfileSecurityPanel from '../../components/profile/ProfileSecurityPanel';

export default function ProfileAccount() {
  return (
    <div className="space-y-8">
      <SettingsProfilePanel embedInMyProfile />
      <div id="security">
        <ProfileSecurityPanel />
      </div>
    </div>
  );
}
