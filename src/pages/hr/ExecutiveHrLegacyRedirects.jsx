import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const FAMILY_TAB_MAP = {
  'family-dashboard': 'family',
  'domestic-dashboard': 'domestic',
  benefits: 'benefits',
  chairman: 'benefits',
  'scholarship-requests': 'requests',
};

const BENEFITS_INNER_TABS = new Set([
  'beneficiaries',
  'school-fees',
  'stipends',
  'domestic',
  'payments',
  'export',
  'expenses',
  'audit',
]);

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

function hubRedirect(base, tabMap, segment, defaultTab, searchParams) {
  const hubTab = tabMap[segment] || defaultTab;
  const params = new URLSearchParams();
  params.set('tab', hubTab);
  const legacyInner = searchParams.get('tab');
  if (hubTab === 'benefits' && legacyInner && BENEFITS_INNER_TABS.has(legacyInner)) {
    params.set('benefitsTab', legacyInner);
  }
  for (const key of ['benefitsTab', 'staff', 'beneficiary']) {
    const v = searchParams.get(key);
    if (v) params.set(key, v);
  }
  return `/executive-hr/${base}?${params.toString()}`;
}

export function ExecutiveHrFamilyLegacyRedirect({ segment }) {
  const [searchParams] = useSearchParams();
  return <Navigate to={hubRedirect('family', FAMILY_TAB_MAP, segment, 'family', searchParams)} replace />;
}

export function ExecutiveHrCompensationLegacyRedirect({ segment }) {
  const [searchParams] = useSearchParams();
  return <Navigate to={hubRedirect('compensation', COMPENSATION_TAB_MAP, segment, 'payroll', searchParams)} replace />;
}

export function ExecutiveHrApprovalsLegacyRedirect({ segment }) {
  const [searchParams] = useSearchParams();
  return <Navigate to={hubRedirect('approvals', APPROVALS_TAB_MAP, segment, 'sensitive', searchParams)} replace />;
}
