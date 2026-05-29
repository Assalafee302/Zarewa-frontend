import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isOfficeDeskV2Enabled } from '../lib/officeDeskFeatureFlag';
import WorkspaceDesk from './WorkspaceDesk';

/**
 * Online Office desk at `/office` when desk v2 is on; otherwise legacy redirect to workspace home.
 */
export default function OfficeDesk() {
  const location = useLocation();
  if (isOfficeDeskV2Enabled()) {
    return <WorkspaceDesk />;
  }
  return <Navigate to="/" replace state={location.state} />;
}
