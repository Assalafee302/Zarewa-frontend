import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canAccessMainHrWorkspace, canAccessTeamHr } from '../../lib/hrAccess';
import HrAccessDenied from './HrAccessDenied';

/** Blocks /hr/* for branch managers and staff without main HR workspace permissions. */
export default function HrMainRouteGuard({ children }) {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  if (canAccessMainHrWorkspace(perms)) return children;
  if (canAccessTeamHr(perms) || ws?.canAccessModule?.('my_profile_hr')) {
    return <HrAccessDenied permissions={perms} />;
  }
  return <HrAccessDenied permissions={perms} />;
}
