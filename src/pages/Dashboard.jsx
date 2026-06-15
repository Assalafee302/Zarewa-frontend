import React, { Suspense } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import LegacyDashboard from './LegacyDashboard';

const WorkspaceDesk = lazyWithRetry(() => import('./WorkspaceDesk'), { id: 'WorkspaceDesk' });

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
  return <LegacyDashboard />;
}
