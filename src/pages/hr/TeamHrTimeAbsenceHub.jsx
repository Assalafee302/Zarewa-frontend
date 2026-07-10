import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useHrUrlTab } from '../../hooks/useHrUrlTab';
import { canMarkHrAttendance } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrAbsenceReportsPanel } from '../../components/hr/HrAbsenceReportsPanel';
import { HrDailyRollPanel } from '../../components/hr/HrDailyRollPanel';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HrTabbedPage } from '../../components/hr/HrTabbedPage';
import { ProfileInlineAlert } from '../../components/profile/profileOverviewUi';
import TeamHrLeaveCalendar from './TeamHrLeaveCalendar';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'endorsements', label: 'Endorsements' },
  { id: 'calendar', label: 'Leave calendar' },
  { id: 'absence', label: 'Absence reports' },
];

export default function TeamHrTimeAbsenceHub() {
  const ws = useWorkspace();
  const canMarkAttendance = canMarkHrAttendance(ws?.permissions);
  const { tab, setTab } = useHrUrlTab('overview', TABS.map((t) => t.id));

  const setSubTab = useCallback(
    (nextTab) => {
      setTab(nextTab);
    },
    [setTab]
  );

  const overviewTiles = useMemo(
    () => [
      { label: 'Daily attendance', tab: 'attendance', hint: 'Mark present, late, or absent' },
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
      hubPrompt="Summarize leave endorsements, attendance, and absence coverage for my branch team."
      hubPageContext={{ teamHrTab: tab }}
    >
      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            Daily attendance is marked here on My Team. Management focuses on approvals and branch performance.
          </ProfileInlineAlert>
        </div>
      ) : null}

      {tab === 'attendance' ? (
        <div className="space-y-4">
          {canMarkAttendance ? (
            <HrDailyRollPanel branchManagerMode />
          ) : (
            <ProfileInlineAlert variant="warning">
              Your role cannot mark daily attendance. Ask a branch manager or HR admin if you need access.
            </ProfileInlineAlert>
          )}
        </div>
      ) : null}

      {tab === 'endorsements' ? (
        <HrRequestsPanel
          allowedScopes={['endorse_queue']}
          defaultScope="endorse_queue"
          staffLinkBase="/hr/employees"
          showStageBar
        />
      ) : null}

      {tab === 'calendar' ? <TeamHrLeaveCalendar embedded /> : null}
      {tab === 'absence' ? (
        <div className="space-y-4">
          <ProfileInlineAlert variant="info">
            Daily roll call is under{' '}
            <Link to="/team-hr/time-absence?tab=attendance" className="font-bold text-zarewa-teal hover:underline">
              Attendance
            </Link>
            . This tab shows formal absence reports submitted for HR review.
          </ProfileInlineAlert>
          <HrAbsenceReportsPanel branchScoped canReview={false} />
        </div>
      ) : null}
    </HrTabbedPage>
  );
}
