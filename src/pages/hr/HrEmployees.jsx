import React, { Suspense, useEffect } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';
import HrOrgChart from './HrOrgChart';

const HrIdCards = lazyWithRetry(() => import('./HrIdCards'), { id: 'HrIdCards' });

const TABS = [
  { id: 'directory', label: 'Employees' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'domestic', label: 'Domestic staff' },
  { id: 'hq-special', label: 'HQ & mining' },
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
      description="Branch employees, scholarship beneficiaries, domestic staff, and HQ/mining — separate registers for special cohorts."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'directory' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="employees" initialRegisterOpen={initialRegisterOpen} />
      ) : null}
      {tab === 'scholarship' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="scholarship" listTitle="Scholarship beneficiaries" />
      ) : null}
      {tab === 'domestic' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="domestic" listTitle="Domestic staff register" />
      ) : null}
      {tab === 'hq-special' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="hq_special" listTitle="HQ administrative & mining" />
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
