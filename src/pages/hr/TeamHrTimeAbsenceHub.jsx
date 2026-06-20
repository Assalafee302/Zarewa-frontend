import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { ProfileInlineAlert } from '../../components/profile/profileOverviewUi';
import TeamHrLeaveCalendar from './TeamHrLeaveCalendar';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'endorsements', label: 'Endorsements' },
  { id: 'calendar', label: 'Leave calendar' },
  { id: 'absence', label: 'Absence reports' },
];

export default function TeamHrTimeAbsenceHub() {
  const { tab, setTab } = useHrUrlTab('overview', TABS.map((t) => t.id));

  const setSubTab = useCallback(
    (nextTab) => {
      setTab(nextTab);
    },
    [setTab]
  );

  const overviewTiles = useMemo(
    () => [
      { label: 'Endorsements', tab: 'endorsements', hint: 'Leave & loan endorsements' },
      { label: 'Leave calendar', tab: 'calendar', hint: 'Approved leave in range' },
      { label: 'Absence reports', tab: 'absence', hint: 'Branch absence submissions' },
    ],
    []
  );

  return (
    <HrTabbedPage
      title="Team time & absence"
      tabs={TABS}
      tab={tab}
      onTabChange={setSubTab}
      hub="team-hr-time-absence"
      hubPrompt="Summarize leave endorsements and absence coverage for my branch team."
      hubPageContext={{ teamHrTab: tab }}
    >
      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {overviewTiles.map((t) => (
              <button
                key={t.tab}
                type="button"
                onClick={() => setSubTab(t.tab)}
                className="rounded-xl border border-teal-100 bg-teal-50/40 px-4 py-3 text-left transition hover:shadow-sm"
              >
                <div className="text-sm font-bold text-slate-900">{t.label}</div>
                <div className="mt-1 text-xs text-slate-600">{t.hint}</div>
              </button>
            ))}
          </div>
          <ProfileInlineAlert variant="info">
            Mark daily present, late, or absent from{' '}
            <Link to="/manager?inbox=attendance" className="font-bold text-[#134e4a] hover:underline">
              Management → Staff attendance
            </Link>
            . Salary figures are not shown on Team HR screens.
          </ProfileInlineAlert>
        </div>
      ) : null}

      {tab === 'endorsements' ? (
        <HrRequestsPanel allowedScopes={['endorse_queue']} defaultScope="endorse_queue" staffLinkBase="/hr/employees" />
      ) : null}

      {tab === 'calendar' ? <TeamHrLeaveCalendar embedded /> : null}
      {tab === 'absence' ? (
        <div className="space-y-4">
          <ProfileInlineAlert variant="info">
            Daily attendance is marked in{' '}
            <Link to="/manager?inbox=attendance" className="font-bold text-[#134e4a] hover:underline">
              Management
            </Link>
            . This tab shows formal absence reports submitted for HR review.
          </ProfileInlineAlert>
          <HrAbsenceReportsPanel branchScoped canReview={false} />
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
