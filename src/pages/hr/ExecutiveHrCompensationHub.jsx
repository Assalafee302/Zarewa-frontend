import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import ExecutiveHrContributions from './ExecutiveHrContributions';
import ExecutiveHrPayrollSummary from './ExecutiveHrPayrollSummary';
import ExecutiveHrSalaryStructure from './ExecutiveHrSalaryStructure';
import ExecutiveHrSpecialChanges from './ExecutiveHrSpecialChanges';
import ExecutiveHrVariance from './ExecutiveHrVariance';

const TABS = [
  { id: 'payroll', label: 'Payroll summary' },
  { id: 'contributions', label: 'Branch contributions' },
  { id: 'salary-structure', label: 'Salary structure' },
  { id: 'variance', label: 'Payroll variance' },
  { id: 'special-changes', label: 'Special changes' },
];

export default function ExecutiveHrCompensationHub() {
  const { tab, setTab } = useHrUrlTab('payroll', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Compensation"
      description="Executive payroll summary, branch contributions, salary structure, variance review, and special pay changes."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="executive-hr-compensation"
      hubPrompt="Summarize executive compensation, payroll variance, and branch contribution status."
      hubPageContext={{ compensationTab: tab }}
    >
      {tab === 'payroll' ? <ExecutiveHrPayrollSummary /> : null}
      {tab === 'contributions' ? <ExecutiveHrContributions /> : null}
      {tab === 'salary-structure' ? <ExecutiveHrSalaryStructure /> : null}
      {tab === 'variance' ? <ExecutiveHrVariance /> : null}
      {tab === 'special-changes' ? <ExecutiveHrSpecialChanges /> : null}
    </HrTabbedPage>
  );
}
