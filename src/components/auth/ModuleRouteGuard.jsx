import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { pathToModuleKey } from '../../lib/departmentWorkspace';

/**
 * Redirects to access-denied when the signed-in user lacks module permissions.
 * Fail closed: missing canAccessModule never grants access.
 * Does not replace server-side checks.
 *
 * @param {string} [moduleKey]
 * @param {string[]} [altModuleKeys]
 * @param {string[]} [allowRoleKeys] — when set, roleKey must be in this list (or hold `*`)
 * @param {string[]} [denyRoleKeys] — when set, these roleKeys are denied even if module perms pass
 */
export default function ModuleRouteGuard({
  moduleKey,
  altModuleKeys = [],
  allowRoleKeys,
  denyRoleKeys,
  children,
}) {
  const ws = useWorkspace();
  const location = useLocation();
  const key = moduleKey ?? pathToModuleKey(location.pathname);
  const keys = key ? [key, ...(Array.isArray(altModuleKeys) ? altModuleKeys : [])] : [];
  if (keys.length === 0) {
    return children;
  }
  if (typeof ws?.canAccessModule !== 'function') {
    return <Navigate to="/access-denied" replace state={{ moduleKey: key, reason: 'guard_unavailable' }} />;
  }
  const rk = String(ws?.session?.user?.roleKey || '')
    .trim()
    .toLowerCase();
  const perms = Array.isArray(ws?.permissions) ? ws.permissions : [];
  const isBreakGlass = perms.includes('*');
  if (Array.isArray(denyRoleKeys) && denyRoleKeys.length > 0) {
    const denied = denyRoleKeys.map((r) => String(r || '').trim().toLowerCase());
    if (rk && denied.includes(rk) && !isBreakGlass) {
      return <Navigate to="/access-denied" replace state={{ moduleKey: key, reason: 'role_denied' }} />;
    }
  }
  if (Array.isArray(allowRoleKeys) && allowRoleKeys.length > 0) {
    const allowed = allowRoleKeys.map((r) => String(r || '').trim().toLowerCase());
    if (!isBreakGlass && (!rk || !allowed.includes(rk))) {
      return <Navigate to="/access-denied" replace state={{ moduleKey: key, reason: 'role_not_allowed' }} />;
    }
  }
  const moduleAllowed = keys.some((k) => ws.canAccessModule(k));
  if (!moduleAllowed) {
    return <Navigate to="/access-denied" replace state={{ moduleKey: key }} />;
  }
  return children;
}
