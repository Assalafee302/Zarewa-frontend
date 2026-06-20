import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const RECRUITMENT_TAB_MAP = {
  jobs: { tab: 'recruit', section: 'jobs' },
  applicants: { tab: 'recruit', section: 'applicants' },
  onboarding: { tab: 'recruit', section: 'onboarding' },
};

const DEVELOPMENT_TAB_MAP = {
  appraisals: { tab: 'develop', section: 'appraisals' },
  training: { tab: 'develop', section: 'training' },
  engagement: { tab: 'develop', section: 'engagement' },
  promotions: { tab: 'develop', section: 'promotions' },
  appraisal: { tab: 'develop', section: 'appraisals' },
};

function talentPath(tab, section) {
  const params = new URLSearchParams({ tab, section });
  return `/hr/talent?${params.toString()}`;
}

export function HrRecruitmentLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab') || 'jobs';
  const mapped = RECRUITMENT_TAB_MAP[legacyTab] || RECRUITMENT_TAB_MAP.jobs;
  return <Navigate to={talentPath(mapped.tab, mapped.section)} replace />;
}

export function HrDevelopmentLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab') || 'appraisals';
  const mapped = DEVELOPMENT_TAB_MAP[legacyTab] || DEVELOPMENT_TAB_MAP.appraisals;
  return <Navigate to={talentPath(mapped.tab, mapped.section)} replace />;
}
