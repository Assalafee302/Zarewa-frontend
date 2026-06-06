import React, { lazy, Suspense } from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrPolicyConfigSection } from '../../components/hr/HrSettingsSections';
import { HrSalaryMatrixPanel } from '../../components/hr/HrSalaryMatrixPanel';
import HrPayroll from './HrPayroll';
import HrLoans from './HrLoans';
import HrBenefits from './HrBenefits';

const HrPayeTaxPension = lazy(() => import('./HrPayeTaxPension'));

const TABS = [
  { id: 'payroll-runs', label: 'Payroll Runs' },
  { id: 'loans', label: 'Loans' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'tax-pension', label: 'Tax & Pension' },
  { id: 'salary-matrix', label: 'Salary Matrix' },
  { id: 'statutory', label: 'Statutory' },
];

export default function HrPayrollHub() {
  const { tab, setTab } = useHrUrlTab('payroll-runs', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Payroll, Loans & Benefits"
      description="HQ payroll runs, staff loans, beneficiaries, tax/pension analytics, salary matrix, and statutory costs."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'payroll-runs' ? <HrPayroll embedded /> : null}
      {tab === 'loans' ? <HrLoans embedded /> : null}
      {tab === 'benefits' ? <HrBenefits embedded /> : null}
      {tab === 'tax-pension' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading tax & pension…</p>}>
          <HrPayeTaxPension embedded />
        </Suspense>
      ) : null}
      {tab === 'salary-matrix' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Level and step amounts by payroll group — used for increments and promotions.</p>
          <HrSalaryMatrixPanel />
        </div>
      ) : null}
      {tab === 'statutory' ? <HrPolicyConfigSection /> : null}
    </HrTabbedPage>
  );
}
