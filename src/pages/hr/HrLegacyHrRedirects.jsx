import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { HR_PAYROLL, HR_TIME_ABSENCE, hrTabPath } from '../../lib/hrRoutes';

const LEAVE_TAB_MAP = {
  balances: 'balances',
  calendar: 'calendar',
  approvals: 'approvals',
  requests: 'approvals',
  holidays: 'holidays',
  'year-end': 'year-end',
};

const ATTENDANCE_TAB_MAP = {
  uploads: 'uploads',
  exceptions: 'exceptions',
  'deduction-preview': 'deductions',
  deductions: 'deductions',
};

function buildTimeAbsencePath(tab, extra = {}) {
  const params = { tab, ...extra };
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return hrTabPath(HR_TIME_ABSENCE, tab, cleaned);
}

export function HrLeaveLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab') || 'balances';
  const tab = LEAVE_TAB_MAP[legacyTab] || 'balances';
  const extra = {};
  if (searchParams.get('requestId')) extra.requestId = searchParams.get('requestId');
  if (searchParams.get('scope')) extra.scope = searchParams.get('scope');
  return <Navigate to={buildTimeAbsencePath(tab, extra)} replace />;
}

export function HrAttendanceLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab') || 'uploads';
  const section = ATTENDANCE_TAB_MAP[legacyTab] || 'uploads';
  return <Navigate to={buildTimeAbsencePath('attendance', { section })} replace />;
}

export function HrRequestsLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'overview';
  const scope = searchParams.get('scope') || '';
  const requestId = searchParams.get('requestId') || '';

  if (view === 'loans') {
    const extra = requestId ? { requestId } : {};
    return <Navigate to={hrTabPath(HR_PAYROLL, 'loans', extra)} replace />;
  }

  const extra = {};
  if (scope) extra.scope = scope;
  if (requestId) extra.requestId = requestId;

  if (view === 'leave') {
    extra.kind = 'leave';
    return <Navigate to={buildTimeAbsencePath('approvals', extra)} replace />;
  }
  if (view === 'queue' || view === 'all') {
    if (view === 'all' && !scope) extra.scope = 'all';
    return <Navigate to={buildTimeAbsencePath('approvals', extra)} replace />;
  }

  return <Navigate to={buildTimeAbsencePath('overview', extra)} replace />;
}
