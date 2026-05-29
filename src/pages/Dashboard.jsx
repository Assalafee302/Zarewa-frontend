import React from 'react';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import WorkspaceDesk from './WorkspaceDesk';
import LegacyDashboard from './LegacyDashboard';

export default function Dashboard() {
  if (isOfficeDeskV2Enabled()) {
    return <WorkspaceDesk />;
  }
  return <LegacyDashboard />;
}
