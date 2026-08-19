import { InlineLoader } from '../../components/ui/PageLoader';
import React, { Suspense, useEffect } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrPayOverviewPanel } from '../../components/hr/HrPayOverviewPanel';
import { HrSalaryStructurePanel } from '../../components/hr/HrSalaryStructurePanel';
import HrPayroll from './HrPayroll';
import HrLoans from './HrLoans';
import HrBenefits from './HrBenefits';
import {
  HR_PAYROLL_TAB_LOANS_LEGACY,
  HR_PAYROLL_TAB_OVERVIEW,
  HR_PAYROLL_TAB_STAFF_CREDIT,
  HR_PAYROLL_TAB_STRUCTURE,
  resolvePayrollStaffCreditTab,
} from '../../lib/hrRoutes';

const HrPayeTaxPension = lazyWithRetry(() => import('./HrPayeTaxPension'), { id: 'HrPayeTaxPension' });

const TABS = [
  { id: HR_PAYROLL_TAB_OVERVIEW, label: 'Overview' },
  { id: HR_PAYROLL_TAB_STRUCTURE, label: 'Salary structure' },
  { id: 'payroll-runs', label: 'This month' },
  { id: HR_PAYROLL_TAB_STAFF_CREDIT, label: 'Loans & deductions' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'tax-pension', label: 'Tax & pension' },
];

const LEGACY_TAB_IDS = ['statutory', HR_PAYROLL_TAB_LOANS_LEGACY, 'salary-matrix'];

function resolvePayTab(rawTab) {
  if (rawTab === 'statutory') return 'tax-pension';
  if (rawTab === 'salary-matrix') return HR_PAYROLL_TAB_STRUCTURE;
  return resolvePayrollStaffCreditTab(rawTab);
}

export default function HrPayrollHub() {
  const validTabs = [...TABS.map((t) => t.id), ...LEGACY_TAB_IDS];
  const { tab: rawTab, setTab } = useHrUrlTab(HR_PAYROLL_TAB_OVERVIEW, validTabs);
  const tab = resolvePayTab(rawTab);

  useEffect(() => {
    if (rawTab === 'statutory') setTab('tax-pension', { section: 'policy' });
    else if (rawTab === HR_PAYROLL_TAB_LOANS_LEGACY) setTab(HR_PAYROLL_TAB_STAFF_CREDIT);
    else if (rawTab === 'salary-matrix') setTab(HR_PAYROLL_TAB_STRUCTURE);
  }, [rawTab, setTab]);

  const hubPrompt =
    tab === HR_PAYROLL_TAB_OVERVIEW
      ? 'Explain the salary structure coverage gaps and what HR should approve or run next.'
      : tab === HR_PAYROLL_TAB_STRUCTURE
        ? 'Summarize current approved salaries, proposed versions, and staff still missing a structure amount.'
        : tab === 'payroll-runs'
          ? 'Explain payroll run status and what HR should prepare or approve next.'
          : tab === HR_PAYROLL_TAB_STAFF_CREDIT
            ? 'Summarize pending staff credit requests, loan endorsements, and purchase credit queues.'
            : tab === 'tax-pension'
              ? 'Summarize PAYE schedules, pension contributions, and statutory policy settings.'
              : 'Summarize benefits payments tied to payroll.';

  return (
    <HrTabbedPage
      title="Pay"
      description="Approved salary by job title, then monthly payroll. Net is never typed — structure minus loans, discipline, PAYE, and pension."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="payroll"
      hubPrompt={hubPrompt}
      hubPageContext={{ payrollTab: tab }}
    >
      {tab === HR_PAYROLL_TAB_OVERVIEW ? <HrPayOverviewPanel onOpenTab={setTab} /> : null}
      {tab === HR_PAYROLL_TAB_STRUCTURE ? <HrSalaryStructurePanel /> : null}
      {tab === 'payroll-runs' ? <HrPayroll embedded /> : null}
      {tab === HR_PAYROLL_TAB_STAFF_CREDIT ? <HrLoans embedded /> : null}
      {tab === 'benefits' ? <HrBenefits embedded /> : null}
      {tab === 'tax-pension' ? (
        <Suspense fallback={<InlineLoader message="Loading PAYE & pension…" />}>
          <HrPayeTaxPension embedded />
        </Suspense>
      ) : null}
    </HrTabbedPage>
  );
}
