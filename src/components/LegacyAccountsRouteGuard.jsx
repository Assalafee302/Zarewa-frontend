import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  resolveLegacyAccountsRedirect,
  userMayAccessLegacyAccountsRoute,
} from '../lib/legacyAccountsAccess';

/** Phase 10 — restrict legacy `/accounts` by role; friendly redirects to desks. */
export default function LegacyAccountsRouteGuard({ children }) {
  const ws = useWorkspace();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const rk = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
  const tab = searchParams.get('tab') || location.state?.accountsTab || '';

  if (!userMayAccessLegacyAccountsRoute(rk, permissions)) {
    const redirect = resolveLegacyAccountsRedirect(rk, permissions, tab);
    if (redirect) {
      return <Navigate to={redirect.to} replace state={{ legacyAccountsDenied: redirect.reason }} />;
    }
  }

  const tabRedirect = resolveLegacyAccountsRedirect(rk, permissions, tab);
  if (tabRedirect && tabRedirect.reason === 'tab_denied') {
    return <Navigate to={tabRedirect.to} replace state={{ legacyAccountsTabDenied: tab }} />;
  }

  return children;
}
