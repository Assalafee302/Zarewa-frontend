import React, { Suspense, useEffect } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';
import HrOrgChart from './HrOrgChart';

const HrIdCards = lazyWithRetry(() => import('./HrIdCards'), { id: 'HrIdCards' });

const TABS = [
  { id: 'directory', label: 'Directory' },
  { id: 'org-chart', label: 'Org Chart' },
  { id: 'id-cards', label: 'ID Cards' },
];

export default function HrEmployees() {
  const { tab, setTab, extra } = useHrUrlTab('directory', TABS.map((t) => t.id));
  const initialRegisterOpen = extra.register === '1';

  useEffect(() => {
    if (extra.register === '1' && tab !== 'directory') {
      setTab('directory');
    }
  }, [extra.register, tab, setTab]);

  return (
    <HrTabbedPage
      title="Employees"
      description="Staff directory, reporting lines, and ID card requests — the central employee hub for HQ HR."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'directory' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} initialRegisterOpen={initialRegisterOpen} />
      ) : null}
      {tab === 'org-chart' ? <HrOrgChart staffBasePath={HR_EMPLOYEES} /> : null}
      {tab === 'id-cards' ? (
        <Suspense fallback={<p className="text-sm text-slate-600">Loading ID cards…</p>}>
          <HrIdCards embedded />
        </Suspense>
      ) : null}
    </HrTabbedPage>
  );
}
