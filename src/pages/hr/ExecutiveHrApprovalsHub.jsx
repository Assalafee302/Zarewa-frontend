import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import ExecutiveHrApprovals from './ExecutiveHrApprovals';
import ExecutiveHrExceptionalLoans from './ExecutiveHrExceptionalLoans';

const TABS = [
  { id: 'sensitive', label: 'Sensitive approvals' },
  { id: 'exceptional-loans', label: 'Exceptional loans' },
];

export default function ExecutiveHrApprovalsHub() {
  const { tab, setTab } = useHrUrlTab('sensitive', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Executive approvals"
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="executive-hr-approvals"
      hubPrompt="Summarize sensitive HR approvals and exceptional loan cases awaiting executive sign-off."
      hubPageContext={{ approvalsTab: tab }}
    >
      {tab === 'sensitive' ? <ExecutiveHrApprovals /> : null}
      {tab === 'exceptional-loans' ? <ExecutiveHrExceptionalLoans /> : null}
    </HrTabbedPage>
  );
}
