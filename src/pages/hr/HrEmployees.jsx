import React, { Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      description="Branch employees use HQ payroll. Scholarship and domestic personnel are personnel registers — their monthly pay is the same as Executive benefits stipends/salaries."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'directory' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="employees" initialRegisterOpen={initialRegisterOpen} />
      ) : null}
      {tab === 'scholarship' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Personnel register for scholarship beneficiaries. Monthly pay = stipend in{' '}
            <Link to="/executive-hr/benefits?tab=stipends" className="font-semibold text-[#134e4a] underline">
              Executive benefits → Monthly Stipends
            </Link>
            .
          </p>
          <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="scholarship" listTitle="Scholarship beneficiaries" />
        </div>
      ) : null}
      {tab === 'domestic' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Personnel register for domestic staff. Monthly pay = salary in{' '}
            <Link to="/executive-hr/benefits?tab=domestic" className="font-semibold text-[#134e4a] underline">
              Executive benefits → Domestic Staff
            </Link>
            .
          </p>
          <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="domestic" listTitle="Domestic staff register" />
        </div>
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
