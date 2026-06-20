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
      description="Sensitive HR decisions and exceptional loan cases requiring executive sign-off."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'sensitive' ? <ExecutiveHrApprovals /> : null}
      {tab === 'exceptional-loans' ? <ExecutiveHrExceptionalLoans /> : null}
    </HrTabbedPage>
  );
}
