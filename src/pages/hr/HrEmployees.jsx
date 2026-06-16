import React, { Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';
import HrOrgChart from './HrOrgChart';

const HrIdCards = lazyWithRetry(() => import('./HrIdCards'), { id: 'HrIdCards' });

const TABS = [
  { id: 'directory', label: 'Employees' },
  { id: 'scholarship', label: FAMILY_BENEFITS.adminRegisterTab },
  { id: 'domestic', label: DOMESTIC_BENEFITS.adminRegisterTab },
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
      description="Branch employees use HQ payroll. Executive family and household staff are paid via Executive benefits."
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
            {FAMILY_BENEFITS.adminRegisterHint}{' '}
            <Link to="/executive-hr/family-dashboard" className="font-semibold text-violet-800 underline">
              Family overview
            </Link>
            {' · '}School fees in{' '}
            <Link to="/executive-hr/benefits?tab=school-fees" className="font-semibold text-[#134e4a] underline">
              Executive benefits → School fees
            </Link>
            ; monthly allowance in{' '}
            <Link to="/executive-hr/benefits?tab=stipends" className="font-semibold text-[#134e4a] underline">
              Executive benefits → Monthly allowance
            </Link>
            .
          </p>
          <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="scholarship" listTitle={FAMILY_BENEFITS.adminRegisterTitle} />
        </div>
      ) : null}
      {tab === 'domestic' ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">{DOMESTIC_BENEFITS.adminRegisterHint}</p>
            <p className="mt-2 text-sm text-amber-900/90">
              <Link to="/executive-hr/domestic-dashboard" className="font-semibold text-amber-800 underline">
                Household staff overview
              </Link>
              {' · '}
              <Link to="/executive-hr/benefits?tab=domestic" className="font-semibold text-[#134e4a] underline">
                Add staff in Executive benefits
              </Link>
              {' · '}Monthly salary in Payment approvals.
            </p>
          </div>
          <p className="text-xs text-slate-500">{DOMESTIC_BENEFITS.adminRegisterOptionalHint}</p>
          <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="domestic" listTitle={DOMESTIC_BENEFITS.adminRegisterTitle} />
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
