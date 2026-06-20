import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrOnboardingQueue } from '../../components/hr/HrOnboardingQueue';
import { HrPromotionDuePanel } from '../../components/hr/HrPromotionDuePanel';

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

function SubViewPills({ views, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            active === v.id ? 'bg-teal-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

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
      description="Recruit and onboard new hires, then run appraisals, training, engagement, and promotion tracking."
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
          <SubViewPills views={RECRUIT_SECTIONS} active={recruitSection} onChange={setSection} />
          {recruitSection === 'jobs' || recruitSection === 'applicants' ? (
            <Suspense fallback={<p className="text-sm text-slate-600">Loading recruiting…</p>}>
              <HrRecruiting />
            </Suspense>
          ) : null}
          {recruitSection === 'onboarding' ? <HrOnboardingQueue /> : null}
        </div>
      ) : null}

      {tab === 'develop' ? (
        <div className="space-y-6">
          <SubViewPills views={DEVELOP_SECTIONS} active={developSection} onChange={setSection} />
          {developSection === 'appraisals' ? (
            <Suspense fallback={<p className="text-sm text-slate-600">Loading appraisals…</p>}>
              <HrAppraisal embedded />
            </Suspense>
          ) : null}
          {developSection === 'training' ? (
            <Suspense fallback={<p className="text-sm text-slate-600">Loading training…</p>}>
              <HrLearning embedded />
            </Suspense>
          ) : null}
          {developSection === 'engagement' ? (
            <Suspense fallback={<p className="text-sm text-slate-600">Loading engagement…</p>}>
              <HrEngagement embedded />
            </Suspense>
          ) : null}
          {developSection === 'promotions' ? <HrPromotionDuePanel /> : null}
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
