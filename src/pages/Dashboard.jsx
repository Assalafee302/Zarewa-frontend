import React, { Suspense, lazy } from 'react';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import { debugBootLog } from '../lib/debugBoot.js';

const LegacyDashboard = lazy(() =>
  import('./LegacyDashboard')
    .then((m) => {
      debugBootLog('Dashboard.jsx:legacy-import-ok', 'LegacyDashboard chunk loaded', {}, 'B');
      return m;
    })
    .catch((err) => {
      debugBootLog(
        'Dashboard.jsx:legacy-import-fail',
        'LegacyDashboard chunk failed',
        { message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 600) },
        'B'
      );
      throw err;
    })
);
const WorkspaceDesk = lazy(() =>
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
    })
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
  return (
    <Suspense fallback={<DashboardLoading />}>
      <LegacyDashboard />
    </Suspense>
  );
}
