import React from 'react';
import { ProfileActionGrid } from '../../components/profile/ProfileActionGrid';
import { Link } from 'react-router-dom';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

export default function ProfileActions() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-black text-slate-900">All services</h2>
        <p className="mt-1 text-sm text-slate-600">
          HR tasks — leave, payslips, documents, and employment — open in{' '}
          <Link to={HR_SELF_SERVICE_PATH.overview} className="font-semibold text-[#134e4a] hover:underline">
            HR self-service
          </Link>
          . Account and password stay on this page. Team and admin workspaces open in their own areas.
        </p>
      </header>
      <ProfileActionGrid />
    </div>
  );
}
