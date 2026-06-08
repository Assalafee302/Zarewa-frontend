import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  userMayViewAccountingDeskClient,
  userMayViewCashierDeskClient,
} from '../lib/financeDeskAccess';

/**
 * Phase B desk routes — does not replace server permission checks on mutations.
 * @param {'cashier' | 'accounting'} desk
 */
export default function FinanceDeskRouteGuard({ desk, children }) {
  const ws = useWorkspace();
  const rk = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
  const ok =
    desk === 'cashier'
      ? userMayViewCashierDeskClient(rk, permissions)
      : userMayViewAccountingDeskClient(rk, permissions);
  if (!ok) {
    const moduleKey = desk === 'cashier' ? 'cashier_desk' : 'accounting_desk';
    return <Navigate to="/access-denied" replace state={{ moduleKey }} />;
  }
  return children;
}
