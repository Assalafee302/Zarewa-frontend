import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrPolicyConfigSection } from '../../components/hr/HrSettingsSections';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import { HrSalaryVarianceReportSection } from '../../components/hr/HrSalaryVarianceReportSection';
import HrPayroll from './HrPayroll';
import HrLoans from './HrLoans';
import HrBenefits from './HrBenefits';

const HrPayeTaxPension = lazyWithRetry(() => import('./HrPayeTaxPension'), { id: 'HrPayeTaxPension' });

const TABS = [
  { id: 'payroll-runs', label: 'Monthly payroll' },
  { id: 'loans', label: 'Loans' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'salary-matrix', label: 'Salary Matrix' },
  { id: 'tax-pension', label: 'PAYE & Pension' },
  { id: 'statutory', label: 'Pension & Statutory' },
];

export default function HrPayrollHub() {
  const { tab, setTab } = useHrUrlTab('payroll-runs', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Payroll & benefits"
      description="Monthly HQ payroll for branch, HQ admin, and mining staff — plus loans, beneficiaries, salary matrix, and statutory rates."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="payroll"
      hubPrompt={
        tab === 'payroll-runs'
          ? 'Explain payroll run status and what HR should prepare or approve next.'
          : tab === 'loans'
            ? 'Summarize pending loan requests and endorsement steps.'
            : 'Summarize salary matrix variances and payroll compliance issues.'
      }
      hubPageContext={{ payrollTab: tab }}
    >
      {tab === 'payroll-runs' ? <HrPayroll embedded /> : null}
      {tab === 'loans' ? <HrLoans embedded /> : null}
      {tab === 'benefits' ? <HrBenefits embedded /> : null}
      {tab === 'salary-matrix' ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Level and step amounts by payroll group — used for increments, promotions, and variance review.</p>
          <HrSalaryMatrixPanel />
          <HrSalaryVarianceReportSection embedded />
        </div>
      ) : null}
      {tab === 'tax-pension' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading PAYE & pension…</p>}>
          <HrPayeTaxPension embedded />
        </Suspense>
      ) : null}
      {tab === 'statutory' ? <HrPolicyConfigSection /> : null}
    </HrTabbedPage>
  );
}
