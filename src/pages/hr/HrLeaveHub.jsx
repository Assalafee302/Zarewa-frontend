import React, { lazy, Suspense, useMemo } from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrPublicHolidaysSection } from '../../components/hr/HrSettingsSections';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canGmApproveHrRequests, canReviewHrRequests } from '../../lib/hrAccess';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import HrLeave from './HrLeave';
import HrLeaveCalendarPanel from './HrLeaveCalendarPanel';

const TABS = [
  { id: 'balances', label: 'Balances' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'requests', label: 'Requests' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'year-end', label: 'Year-end' },
];

export default function HrLeaveHub() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const { tab, setTab } = useHrUrlTab('balances', TABS.map((t) => t.id));

  const requestScopes = useMemo(() => {
    const scopes = [];
    if (canReviewHrRequests(perms)) scopes.push('hr_queue');
    if (canGmApproveHrRequests(perms)) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [perms]);

  return (
    <HrTabbedPage
      title="Leave & Absence"
      description="Leave balances, calendar, approval queue, public holidays, and year-end carry-over."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'balances' ? <HrLeave embedded /> : null}
      {tab === 'calendar' ? <HrLeaveCalendarPanel /> : null}
      {tab === 'requests' ? (
        <HrRequestsPanel
          allowedScopes={requestScopes}
          defaultScope={requestScopes[0] || 'all'}
          kindFilter="leave"
          staffLinkBase={HR_EMPLOYEES}
        />
      ) : null}
      {tab === 'holidays' ? <HrPublicHolidaysSection embedded /> : null}
      {tab === 'year-end' ? <HrLeave embedded showYearEndOnly /> : null}
    </HrTabbedPage>
  );
}
