import React, { Suspense, lazy } from 'react';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';

const LegacyDashboard = lazy(() => import('./LegacyDashboard'));
const WorkspaceDesk = lazy(() => import('./WorkspaceDesk'));

function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <p className="text-sm font-semibold text-slate-600">Loading workspace…</p>
    </div>
  );
}

export default function Dashboard() {
  if (isOfficeDeskV2Enabled()) {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <WorkspaceDesk />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<DashboardLoading />}>
      <LegacyDashboard />
    </Suspense>
  );
}
