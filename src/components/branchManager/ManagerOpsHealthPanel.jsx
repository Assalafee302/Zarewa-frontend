import React from 'react';
import { OpsHealthAnalyticsPanel } from '../finance/OpsHealthAnalyticsPanel';

/** Compact branch-manager view of the shared operations health scorecard. */
export function ManagerOpsHealthPanel({ branchId = '' }) {
  return <OpsHealthAnalyticsPanel branchId={branchId} compact />;
}
