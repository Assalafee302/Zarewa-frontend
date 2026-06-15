import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { userMayPerformManagerQuotationClearance } from '../lib/workspaceGovernanceClient';

/** Branch manager desk — not general sales officers with quotations.manage only. */
export default function ManagerRouteGuard({ children }) {
  const ws = useWorkspace();
  const user = ws?.session?.user;
  if (!userMayPerformManagerQuotationClearance(user)) {
    return <Navigate to="/access-denied" replace />;
  }
  return children;
}
