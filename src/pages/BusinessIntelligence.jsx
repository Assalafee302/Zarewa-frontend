import React from 'react';
import { Navigate } from 'react-router-dom';
import { MainPanel, PageHeader } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { userMayViewManagementReportsClient } from '../lib/reportsAccess';
import CommandCentreIntelligenceTab from '../components/exec/CommandCentreIntelligenceTab';

/** Standalone /analytics — redirects into Command Centre when exec access exists. */
export default function BusinessIntelligence() {
  const ws = useWorkspace();
  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
  const mayView = userMayViewManagementReportsClient(roleKey, permissions);
  const hasExec = Boolean(ws?.hasPermission?.('exec.dashboard.view'));

  if (!mayView) {
    return <Navigate to="/" replace />;
  }

  if (hasExec) {
    return <Navigate to="/exec?tab=intelligence" replace />;
  }

  return (
    <MainPanel>
      <PageHeader
        title="Business intelligence"
        subtitle="Production & inventory forecasts, expense analysis, and material winners."
      />
      <CommandCentreIntelligenceTab />
    </MainPanel>
  );
}
