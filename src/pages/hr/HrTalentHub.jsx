import { InlineLoader } from '../../components/ui/PageLoader';
import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrOnboardingQueue } from '../../components/hr/HrOnboardingQueue';
import { HrPromotionDuePanel } from '../../components/hr/HrPromotionDuePanel';
import { HrSubViewTabs } from '../../components/hr/HrSubViewTabs';

const HrRecruiting = lazyWithRetry(() => import('./HrRecruiting'), { id: 'HrRecruiting' });
const HrAppraisal = lazyWithRetry(() => import('./HrAppraisal'), { id: 'HrAppraisal' });
const HrLearning = lazyWithRetry(() => import('./HrLearning'), { id: 'HrLearning' });
const HrEngagement = lazyWithRetry(() => import('./HrEngagement'), { id: 'HrEngagement' });

const PRIMARY_TABS = [
  { id: 'recruit', label: 'Recruit' },
  { id: 'develop', label: 'Develop' },
];

const RECRUIT_SECTIONS = [
  { id: 'jobs', label: 'Job postings' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'onboarding', label: 'Onboarding' },
];

const DEVELOP_SECTIONS = [
  { id: 'appraisals', label: 'Appraisals' },
  { id: 'training', label: 'Training' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'promotions', label: 'Promotions' },
];

export default function HrTalentHub() {
  const validPrimary = PRIMARY_TABS.map((t) => t.id);
  const { tab, setTab, searchParams, setSearchParams } = useHrUrlTab('recruit', validPrimary);
  const section = searchParams.get('section') || (tab === 'recruit' ? 'jobs' : 'appraisals');

  const setSection = (next) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set('section', next);
      return nextParams;
    });
  };

  const recruitSection = RECRUIT_SECTIONS.some((s) => s.id === section) ? section : 'jobs';
  const developSection = DEVELOP_SECTIONS.some((s) => s.id === section) ? section : 'appraisals';

  return (
    <HrTabbedPage
      title="Talent & development"
      tabs={PRIMARY_TABS}
      tab={tab}
      onTabChange={(next) =>
        setTab(next, { section: next === 'recruit' ? recruitSection : developSection })
      }
      hub="talent"
      hubPrompt={
        tab === 'recruit'
          ? 'Summarize open roles, applicants, and onboarding tasks for new hires.'
          : 'Summarize appraisals, training due, and promotion reviews across staff.'
      }
      hubPageContext={{ talentTab: tab, recruitSection, developSection }}
    >
      {tab === 'recruit' ? (
        <div className="space-y-6">
          <HrSubViewTabs tabs={RECRUIT_SECTIONS} value={recruitSection} onChange={setSection} ariaLabel="Recruit sections" />
          {recruitSection === 'jobs' || recruitSection === 'applicants' ? (
            <Suspense fallback={<InlineLoader message="Loading recruiting…" />}>
              <HrRecruiting embedded />
            </Suspense>
          ) : null}
          {recruitSection === 'onboarding' ? <HrOnboardingQueue /> : null}
        </div>
      ) : null}

      {tab === 'develop' ? (
        <div className="space-y-6">
          <HrSubViewTabs tabs={DEVELOP_SECTIONS} value={developSection} onChange={setSection} ariaLabel="Develop sections" />
          {developSection === 'appraisals' ? (
            <Suspense fallback={<InlineLoader message="Loading appraisals…" />}>
              <HrAppraisal embedded />
            </Suspense>
          ) : null}
          {developSection === 'training' ? (
            <Suspense fallback={<InlineLoader message="Loading training…" />}>
              <HrLearning embedded />
            </Suspense>
          ) : null}
          {developSection === 'engagement' ? (
            <Suspense fallback={<InlineLoader message="Loading engagement…" />}>
              <HrEngagement embedded />
            </Suspense>
          ) : null}
          {developSection === 'promotions' ? <HrPromotionDuePanel /> : null}
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
