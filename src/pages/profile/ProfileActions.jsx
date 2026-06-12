import React from 'react';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';

export default function ProfileActions() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Everything available to you in one place — account settings, self-service requests, and workspaces you can
        open. HR employment records open in their own screens when you choose a self-service action.
      </p>
      <ProfileActionGrid />
    </div>
  );
}
