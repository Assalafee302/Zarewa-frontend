import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';

const TAB_MAP = {
  requests: 'endorsements',
  attendance: 'absence',
  'leave-calendar': 'calendar',
};

export function TeamHrRequestsLegacyRedirect() {
  return <Navigate to={teamHrTimeAbsencePath('endorsements')} replace />;
}

export function TeamHrAttendanceLegacyRedirect() {
  return <Navigate to={teamHrTimeAbsencePath('absence')} replace />;
}

export function TeamHrLeaveCalendarLegacyRedirect() {
  return <Navigate to={teamHrTimeAbsencePath('calendar')} replace />;
}

export function TeamHrLegacyTabRedirect({ legacyPath }) {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || '';
  const mapped = TAB_MAP[legacyPath] || TAB_MAP[tab] || 'overview';
  const extra = {};
  if (searchParams.get('requestId')) extra.requestId = searchParams.get('requestId');
  return <Navigate to={teamHrTimeAbsencePath(mapped, extra)} replace />;
}
