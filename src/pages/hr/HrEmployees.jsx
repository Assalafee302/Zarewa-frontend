import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { canManageHrStaff } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import HrStaffDirectory from './HrStaffDirectory';
import HrOrgChart from './HrOrgChart';

const TABS = [
  { id: 'directory', label: 'Directory' },
  { id: 'org-chart', label: 'Org chart' },
];

/** Legacy tab URLs → Chairman Office (these people are not company HR) */
const LEGACY_REDIRECTS = {
  scholarship: '/chairman?tab=scholarships',
  domestic: '/chairman?tab=household',
  'hq-special': '/chairman?tab=mining',
  mining: '/chairman?tab=mining',
  'id-cards': '/hr/documents?tab=id-cards',
};

export default function HrEmployees() {
  const { tab, setTab, extra } = useHrUrlTab('directory', TABS.map((t) => t.id));
  const initialRegisterOpen = extra.register === '1';
  const ws = useWorkspace();
  const showTalent = canManageHrStaff(ws?.permissions || []);

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showTalent ? (
            <Link
              to="/hr/talent"
              className="inline-flex rounded-sm border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              Talent
            </Link>
          ) : null}
          <Link
            to="/chairman?tab=scholarships"
            className="inline-flex rounded-sm border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Chairman Office
          </Link>
        </div>
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
