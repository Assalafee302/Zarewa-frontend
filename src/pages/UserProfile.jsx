import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { UserProfileShell } from '../components/profile/UserProfileShell';
import ProfileOverview from './profile/ProfileOverview';
import ProfileAccount from './profile/ProfileAccount';
import ProfileSecurityPanel from '../components/profile/ProfileSecurityPanel';
import ProfileActions from './profile/ProfileActions';

export default function UserProfile() {
  return (
    <Routes>
      <Route element={<UserProfileShell />}>
        <Route index element={<ProfileOverview />} />
        <Route path="account" element={<ProfileAccount />} />
        <Route path="security" element={<ProfileSecurityPanel />} />
        <Route path="actions" element={<ProfileActions />} />
        <Route path="*" element={<Navigate to="/me" replace />} />
      </Route>
    </Routes>
  );
}
