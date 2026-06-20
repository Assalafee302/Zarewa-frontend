import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';
import HrOrgChart from './HrOrgChart';

const TABS = [
  { id: 'directory', label: 'Directory' },
  { id: 'org-chart', label: 'Org chart' },
];

/** Legacy tab URLs → new locations */
const LEGACY_REDIRECTS = {
  scholarship: '/hr/employees/registers?tab=scholarship',
  domestic: '/hr/employees/registers?tab=domestic',
  'hq-special': '/hr/employees/registers?tab=hq-special',
  'id-cards': '/hr/documents?tab=id-cards',
};

export default function HrEmployees() {
  const { tab, setTab, extra } = useHrUrlTab('directory', TABS.map((t) => t.id));
  const initialRegisterOpen = extra.register === '1';

  useEffect(() => {
    if (extra.register === '1' && tab !== 'directory') {
      setTab('directory');
    }
  }, [extra.register, tab, setTab]);

  if (LEGACY_REDIRECTS[tab]) {
    return <Navigate to={LEGACY_REDIRECTS[tab]} replace />;
  }

  return (
    <HrTabbedPage
      title="Employees"
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
      hub="employees"
      hubPrompt={
        tab === 'org-chart'
          ? 'Explain the org chart structure and reporting lines visible to me.'
          : 'Which staff profiles need attention — incomplete records, probation, or document gaps?'
      }
      hubPageContext={{ employeesTab: tab }}
      actions={
        <Link
          to="/hr/employees/registers"
          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
        >
          Staff registers
        </Link>
      }
    >
      {tab === 'directory' ? (
        <HrStaffDirectory
          staffBasePath={HR_EMPLOYEES}
          cohort="employees"
          initialRegisterOpen={initialRegisterOpen}
          initialQuickFilter={extra.quick || ''}
        />
      ) : null}
      {tab === 'org-chart' ? <HrOrgChart staffBasePath={HR_EMPLOYEES} /> : null}
    </HrTabbedPage>
  );
}
