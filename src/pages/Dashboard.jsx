import React, { Suspense } from 'react';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import { PageLoader } from '../components/ui/PageLoader';
import LegacyDashboard from './LegacyDashboard';

const WorkspaceDesk = lazyWithRetry(() => import('./WorkspaceDesk'), { id: 'WorkspaceDesk' });

export default function Dashboard() {
  if (isOfficeDeskV2Enabled()) {
    return (
      <Suspense fallback={<PageLoader message="Loading workspace…" />}>
        <WorkspaceDesk />
      </Suspense>
    );
  }
  return <LegacyDashboard />;
}
