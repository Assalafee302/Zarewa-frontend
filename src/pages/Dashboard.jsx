import React, { Suspense } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { isWorkspaceV3Enabled } from '../lib/workspaceV3FeatureFlag';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import { PageLoader } from '../components/ui/PageLoader';
import LegacyDashboard from './LegacyDashboard';

const WorkspaceDesk = lazyWithRetry(() => import('./WorkspaceDesk'), { id: 'WorkspaceDesk' });
const WorkspaceShell = lazyWithRetry(() => import('./WorkspaceShell'), { id: 'WorkspaceShell' });

export default function Dashboard() {
  if (isWorkspaceV3Enabled()) {
    return (
      <Suspense fallback={<PageLoader message="Loading workspace…" />}>
        <WorkspaceShell />
      </Suspense>
    );
  }
  if (isOfficeDeskV2Enabled()) {
    return (
      <Suspense fallback={<PageLoader message="Loading workspace…" />}>
        <WorkspaceDesk />
      </Suspense>
    );
  }
  return <LegacyDashboard />;
}
