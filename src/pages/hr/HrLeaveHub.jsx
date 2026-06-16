import React from 'react';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { HrLeaveRequestsLinkPanel } from '../../components/hr/HrLeaveRequestsLinkPanel';
import { HrPublicHolidaysSection } from '../../components/hr/HrSettingsSections';
import HrLeave from './HrLeave';
import HrLeaveCalendarPanel from './HrLeaveCalendarPanel';

const TABS = [
  { id: 'balances', label: 'Balances' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'year-end', label: 'Year-end' },
];

export default function HrLeaveHub() {
  const validTabs = [...TABS.map((t) => t.id), 'requests'];
  const { tab: urlTab, setTab } = useHrUrlTab('balances', validTabs);
  const tab = urlTab === 'requests' ? 'approvals' : urlTab;

  return (
    <HrTabbedPage
      title="Leave & Absence"
      description="Leave balances, calendar, public holidays, and year-end carry-over. Approval queues live under Requests."
      tabs={TABS}
      tab={tab}
      onTabChange={setTab}
    >
      {tab === 'balances' ? <HrLeave embedded /> : null}
      {tab === 'calendar' ? <HrLeaveCalendarPanel /> : null}
      {tab === 'approvals' ? <HrLeaveRequestsLinkPanel /> : null}
      {tab === 'holidays' ? <HrPublicHolidaysSection embedded /> : null}
      {tab === 'year-end' ? <HrLeave embedded showYearEndOnly /> : null}
    </HrTabbedPage>
  );
}
