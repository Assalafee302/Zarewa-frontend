import React from 'react';
import { Link } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';

const TABS = [
  { id: 'scholarship', label: FAMILY_BENEFITS.adminRegisterTab },
  { id: 'domestic', label: DOMESTIC_BENEFITS.adminRegisterTab },
  { id: 'hq-special', label: 'HQ & mining' },
];

export default function HrStaffRegisters() {
  const { tab, setTab } = useHrUrlTab('scholarship', TABS.map((t) => t.id));

  return (
    <HrTabbedPage
      title="Staff registers"
      description="Executive family, household staff, and HQ administrative registers. These people are not branch payroll employees."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'scholarship' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {FAMILY_BENEFITS.adminRegisterHint}{' '}
            <Link to="/executive-hr/family-dashboard" className="font-semibold text-violet-800 underline">
              Family overview
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
                Executive benefits → Domestic staff
              </Link>
            </p>
          </div>
          <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="domestic" listTitle={DOMESTIC_BENEFITS.adminRegisterTitle} />
        </div>
      ) : null}
      {tab === 'hq-special' ? (
        <HrStaffDirectory staffBasePath={HR_EMPLOYEES} cohort="hq_special" listTitle="HQ administrative & mining" />
      ) : null}
    </HrTabbedPage>
  );
}
