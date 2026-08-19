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
  const permissions = ws?.permissions;
  const tab = searchParams.get('tab') || location.state?.accountsTab || '';
  const currentPath = location.pathname || '/accounts';
  const currentSearch = location.search || '';

  const isSameLocation = (to) => {
    const dest = String(to || '');
    const destPath = dest.split('?')[0] || '';
    const destSearch = dest.includes('?') ? dest.slice(dest.indexOf('?')) : '';
    if (destPath !== currentPath) return false;
    if (!destSearch) return true;
    return destSearch === currentSearch;
  };

  if (!userMayAccessLegacyAccountsRoute(rk, permissions)) {
    const redirect = resolveLegacyAccountsRedirect(rk, permissions, tab);
    if (redirect?.to && !isSameLocation(redirect.to)) {
      return <Navigate to={redirect.to} replace state={{ legacyAccountsDenied: redirect.reason }} />;
    }
  }

  const tabRedirect = resolveLegacyAccountsRedirect(rk, permissions, tab);
  if (tabRedirect && tabRedirect.reason === 'tab_denied' && tabRedirect.to && !isSameLocation(tabRedirect.to)) {
    return <Navigate to={tabRedirect.to} replace state={{ legacyAccountsTabDenied: tab }} />;
  }

  return children;
}
