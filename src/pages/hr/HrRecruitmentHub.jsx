import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrOnboardingQueue } from '../../components/hr/HrOnboardingQueue';

const HrRecruiting = lazyWithRetry(() => import('./HrRecruiting'), { id: 'HrRecruiting' });

const TABS = [
  { id: 'jobs', label: 'Job postings' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'onboarding', label: 'Onboarding' },
];

export default function HrRecruitmentHub() {
  const { tab, setTab } = useHrUrlTab('jobs', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Recruitment & onboarding"
      description="Job postings, applicant pipeline, offer letters, and onboarding checklists for new hires."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'jobs' || tab === 'applicants' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading recruiting…</p>}>
          <HrRecruiting embedded />
        </Suspense>
      ) : null}
      {tab === 'onboarding' ? <HrOnboardingQueue /> : null}
    </HrTabbedPage>
  );
}
