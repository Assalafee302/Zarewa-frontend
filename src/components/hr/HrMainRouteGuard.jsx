import React from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  canAccessMainHrWorkspace,
  canAccessTeamHr,
  canViewHrSettings,
} from '../../lib/hrAccess';
import HrAccessDenied from './HrAccessDenied';

function isHrSettingsPath(pathname) {
  return pathname === '/hr/settings' || pathname.startsWith('/hr/settings/');
}

/** Blocks /hr/* for branch managers and staff without main HR workspace permissions. */
export default function HrMainRouteGuard({ children }) {
  const ws = useWorkspace();
  const { pathname } = useLocation();
  const perms = ws?.permissions || [];

  if (canAccessMainHrWorkspace(perms)) return children;

  if (isHrSettingsPath(pathname) && canViewHrSettings(perms)) {
    return children;
  }

  if (canAccessTeamHr(perms) || ws?.canAccessModule?.('my_profile_hr')) {
    return <HrAccessDenied permissions={perms} />;
  }
  return <HrAccessDenied permissions={perms} />;
}
