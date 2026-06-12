import React from 'react';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';

export default function ProfileActions() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-black text-slate-900">All services</h2>
        <p className="mt-1 text-sm text-slate-600">
          Self-service forms open right here under My profile. Team and admin workspaces open in their own areas when
          you need them.
        </p>
      </header>
      <ProfileActionGrid />
    </div>
  );
}
