import React, { lazy, Suspense } from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrPromotionDuePanel } from '../../components/hr/HrPromotionDuePanel';

const HrAppraisal = lazy(() => import('./HrAppraisal'));
const HrLearning = lazy(() => import('./HrLearning'));
const HrEngagement = lazy(() => import('./HrEngagement'));

const TABS = [
  { id: 'appraisals', label: 'Appraisals' },
  { id: 'training', label: 'Training' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'promotions', label: 'Promotions' },
];

export default function HrDevelopmentHub() {
  const { tab, setTab } = useHrUrlTab('appraisals', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Performance, Promotion & Training"
      description="Appraisal cycles, training records, engagement surveys, and promotion tracking."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'appraisals' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading appraisals…</p>}>
          <HrAppraisal embedded />
        </Suspense>
      ) : null}
      {tab === 'training' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading training…</p>}>
          <HrLearning embedded />
        </Suspense>
      ) : null}
      {tab === 'engagement' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading engagement…</p>}>
          <HrEngagement embedded />
        </Suspense>
      ) : null}
      {tab === 'promotions' ? <HrPromotionDuePanel /> : null}
    </HrTabbedPage>
  );
}
