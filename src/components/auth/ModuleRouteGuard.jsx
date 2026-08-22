import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { pathToModuleKey } from '../../lib/departmentWorkspace';

/**
 * Redirects to access-denied when the signed-in user lacks module permissions.
 * Fail closed: missing canAccessModule never grants access.
 * Does not replace server-side checks.
 */
export default function ModuleRouteGuard({ moduleKey, altModuleKeys = [], children }) {
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
  const allowed = keys.some((k) => ws.canAccessModule(k));
  if (!allowed) {
    return <Navigate to="/access-denied" replace state={{ moduleKey: key }} />;
  }
  return children;
}
