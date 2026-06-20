import React from 'react';
import { Navigate } from 'react-router-dom';

const FAMILY_TAB_MAP = {
  'family-dashboard': 'family',
  'domestic-dashboard': 'domestic',
  benefits: 'benefits',
  chairman: 'benefits',
  'scholarship-requests': 'requests',
};

const COMPENSATION_TAB_MAP = {
  payroll: 'payroll',
  contributions: 'contributions',
  'salary-structure': 'salary-structure',
  variance: 'variance',
  'special-changes': 'special-changes',
};

const APPROVALS_TAB_MAP = {
  approvals: 'sensitive',
  'exceptional-loans': 'exceptional-loans',
};

function hubRedirect(base, tabMap, segment, defaultTab) {
  const tab = tabMap[segment] || defaultTab;
  return `/executive-hr/${base}?tab=${encodeURIComponent(tab)}`;
}

export function ExecutiveHrFamilyLegacyRedirect({ segment }) {
  return <Navigate to={hubRedirect('family', FAMILY_TAB_MAP, segment, 'family')} replace />;
}

export function ExecutiveHrCompensationLegacyRedirect({ segment }) {
  return <Navigate to={hubRedirect('compensation', COMPENSATION_TAB_MAP, segment, 'payroll')} replace />;
}

export function ExecutiveHrApprovalsLegacyRedirect({ segment }) {
  return <Navigate to={hubRedirect('approvals', APPROVALS_TAB_MAP, segment, 'sensitive')} replace />;
}
