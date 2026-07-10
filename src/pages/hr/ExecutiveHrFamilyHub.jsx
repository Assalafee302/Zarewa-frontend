import { InlineLoader } from '../../components/ui/PageLoader';
import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { Link } from 'react-router-dom';
import { HR_EMPLOYEE_REGISTERS } from '../../lib/hrRoutes';
import ExecutiveHrFamilyDashboard from './ExecutiveHrFamilyDashboard';
import ExecutiveHrDomesticDashboard from './ExecutiveHrDomesticDashboard';
import ExecutiveHrScholarshipRequests from './ExecutiveHrScholarshipRequests';

const HrExecutiveBenefitsHub = lazyWithRetry(() => import('./HrChairmanAccounts'), { id: 'HrChairmanAccounts' });

const TABS = [
  { id: 'family', label: 'Family overview' },
  { id: 'domestic', label: 'Household staff' },
  { id: 'benefits', label: 'Executive benefits' },
  { id: 'requests', label: 'Benefit requests' },
];

export default function ExecutiveHrFamilyHub() {
  const { tab, setTab } = useHrUrlTab('family', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Family & household"
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="executive-hr-family"
      hubPrompt="Summarize executive family benefits, household staff, and pending benefit requests."
      hubPageContext={{ executiveTab: tab }}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${HR_EMPLOYEE_REGISTERS}?tab=scholarship`}
            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 no-underline"
          >
            Family register
          </Link>
          <Link
            to={`${HR_EMPLOYEE_REGISTERS}?tab=domestic`}
            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 no-underline"
          >
            Household register
          </Link>
        </div>
      }
    >
      {tab === 'family' ? <ExecutiveHrFamilyDashboard /> : null}
      {tab === 'domestic' ? <ExecutiveHrDomesticDashboard /> : null}
      {tab === 'benefits' ? (
        <Suspense fallback={<InlineLoader message="Loading executive benefits…" />}>
          <HrExecutiveBenefitsHub embedded />
        </Suspense>
      ) : null}
      {tab === 'requests' ? <ExecutiveHrScholarshipRequests /> : null}
    </HrTabbedPage>
  );
}
