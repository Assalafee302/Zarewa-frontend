import React, { Suspense } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import { debugBootLog } from '../lib/debugBoot.js';
import LegacyDashboard from './LegacyDashboard';

const WorkspaceDesk = lazyWithRetry(
  () =>
    import('./WorkspaceDesk')
      .then((m) => {
        debugBootLog('Dashboard.jsx:desk-import-ok', 'WorkspaceDesk chunk loaded', {}, 'C');
        return m;
      })
      .catch((err) => {
        debugBootLog(
          'Dashboard.jsx:desk-import-fail',
          'WorkspaceDesk chunk failed',
          { message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 600) },
          'C'
        );
        throw err;
      }),
  { id: 'WorkspaceDesk' }
);

function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <p className="text-sm font-semibold text-slate-600">Loading workspace…</p>
    </div>
  );
}

export default function Dashboard() {
  const v2 = isOfficeDeskV2Enabled();
  debugBootLog('Dashboard.jsx:route', 'Dashboard branch selected', { officeDeskV2: v2 }, v2 ? 'C' : 'B');
  if (v2) {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <WorkspaceDesk />
      </Suspense>
    );
  }
  return <LegacyDashboard />;
}
