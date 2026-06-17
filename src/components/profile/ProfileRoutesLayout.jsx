import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserProfileProvider } from '../../context/UserProfileContext';

/** Shared provider for /me and /my-profile — single /api/hr/me fetch when switching hubs. */
export default function ProfileRoutesLayout() {
  return (
    <UserProfileProvider>
      <Outlet />
    </UserProfileProvider>
  );
}
