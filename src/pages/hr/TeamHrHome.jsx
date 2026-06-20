import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrHubToolbar } from '../../components/hr/HrHubToolbar';
import HrMobileAlertStrip from '../../components/hr/HrMobileAlertStrip';
import { TeamHrNextStepBanner } from '../../components/hr/TeamHrNextStepBanner';
import { TeamHrManagerOnboardingPanel } from '../../components/hr/TeamHrManagerOnboardingPanel';
import { HrEmptyState, HrPageBody, HrPageToolbar } from '../../components/hr/hrPageUi';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
  ProfileQuickAction,
} from '../../components/profile/profileOverviewUi';

const VIEW_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'insights', label: 'Team insights' },
];

function TeamDashboardViewBar({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Team dashboard view">
      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === opt.id
              ? 'border-[#134e4a]/30 bg-[#134e4a] text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function TeamHrHome() {
  const [summary, setSummary] = useState(null);
  const [view, setView] = useState('today');

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data: body } = await apiFetch('/api/hr/team/summary?scope=team');
    if (!ok || !body?.ok) {
      setSummary(null);
      return { error: body?.error || 'Could not load team summary.', hasData: false };
    }
    setSummary(body);
    return { hasData: true };
  }, []);

  const s = summary || {};
  const actionPending = useMemo(
    () => (s.pendingLeave ?? 0) + (s.pendingLoan ?? 0) + (s.pendingTransfer ?? 0) + (s.openIncidents ?? 0),
    [s.pendingLeave, s.pendingLoan, s.pendingTransfer, s.openIncidents]
  );

  const mobileItems = [
    { key: 'leave', label: 'leave endorsements', count: s.pendingLeave ?? 0, tone: 'amber', href: teamHrTimeAbsencePath('endorsements') },
    { key: 'loan', label: 'loan endorsements', count: s.pendingLoan ?? 0, tone: 'amber', href: teamHrTimeAbsencePath('endorsements') },
    { key: 'transfer', label: 'transfers', count: s.pendingTransfer ?? 0, tone: 'teal', href: '/team-hr/transfers' },
    { key: 'incidents', label: 'incidents', count: s.openIncidents ?? 0, tone: 'red', href: '/team-hr/incidents' },
  ];

  if (loading && !summary) {
    return (
      <HrPageBody>
        <ProfileMetricSkeleton count={4} />
      </HrPageBody>
    );
  }

  if (error) {
    return (
      <HrPageBody>
        <ProfileInlineAlert variant="error">
          {error}{' '}
          <button type="button" className="font-bold underline" onClick={() => void reload()}>
            Retry
          </button>
        </ProfileInlineAlert>
      </HrPageBody>
    );
  }

  const isToday = view === 'today';

  return (
    <HrPageBody>
      <HrPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TeamDashboardViewBar value={view} onChange={setView} />
          <HrHubToolbar
            hub="team-hr-dashboard"
            prompt="Summarize my branch team HR queues and what needs endorsement today."
            pageContext={{ branchStaff: s.count, dashboardView: view }}
          />
        </div>
      </HrPageToolbar>

      {isToday ? (
        <>
          <TeamHrManagerOnboardingPanel />
          <TeamHrNextStepBanner
            pendingLeave={s.pendingLeave}
            pendingLoan={s.pendingLoan}
            pendingTransfer={s.pendingTransfer}
            openIncidents={s.openIncidents}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HrKpiCard
              label="Leave endorsements"
              value={s.pendingLeave ?? 0}
              hint="Awaiting your endorsement"
              tone={s.pendingLeave > 0 ? 'amber' : 'default'}
              to={teamHrTimeAbsencePath('endorsements')}
            />
            <HrKpiCard
              label="Loan endorsements"
              value={s.pendingLoan ?? 0}
              hint="Submitted loan requests"
              tone={s.pendingLoan > 0 ? 'amber' : 'default'}
              to={teamHrTimeAbsencePath('endorsements')}
            />
            <HrKpiCard
              label="Transfer endorsements"
              value={s.pendingTransfer ?? 0}
              hint="Awaiting branch review"
              tone={s.pendingTransfer > 0 ? 'amber' : 'default'}
              to="/team-hr/transfers"
            />
            <HrKpiCard
              label="Open incidents"
              value={s.openIncidents ?? 0}
              hint="Incident memos"
              tone={s.openIncidents > 0 ? 'red' : 'default'}
              to="/team-hr/incidents"
            />
          </div>

          <HrMobileAlertStrip items={mobileItems} />

          {actionPending === 0 ? (
            <HrEmptyState
              title="All clear for today"
              description="No leave, loan, transfer, or incident items need your action right now."
              action={
                <Link
                  to={teamHrTimeAbsencePath('calendar')}
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-semibold text-white no-underline hover:bg-[#0f3d3a]"
                >
                  View leave calendar →
                </Link>
              }
            />
          ) : null}

          <ProfileOverviewSection title="Quick actions">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <ProfileQuickAction to={teamHrTimeAbsencePath('endorsements')} icon="📋">
                Endorsements
              </ProfileQuickAction>
              <ProfileQuickAction to="/manager?inbox=attendance" icon="✓">
                Attendance
              </ProfileQuickAction>
              <ProfileQuickAction to="/team-hr/staff" icon="👥">
                Team roster
              </ProfileQuickAction>
              <ProfileQuickAction to="/team-hr/incidents" icon="⚠️">
                Incidents
              </ProfileQuickAction>
              <ProfileQuickAction to="/team-hr/transfers" icon="↔️">
                Transfers
              </ProfileQuickAction>
            </div>
          </ProfileOverviewSection>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <HrKpiCard label="Branch staff" value={s.count ?? 0} hint="Active team members" tone="teal" to="/team-hr/staff" />
            <HrKpiCard
              label="On probation"
              value={s.onProbation ?? 0}
              hint="Ending within 30 days"
              tone={s.onProbation > 0 ? 'amber' : 'default'}
              to="/team-hr/staff"
            />
            <HrKpiCard
              label="Expiring documents"
              value={s.documentsExpiring ?? 0}
              hint="Within 60 days"
              tone={s.documentsExpiring > 0 ? 'red' : 'default'}
              to="/team-hr/staff"
            />
            <HrKpiCard label="Leave calendar" value="→" hint="Upcoming leave" tone="emerald" to={teamHrTimeAbsencePath('calendar')} />
          </div>

          <ProfileOverviewSection title="Explore your team" subtitle="Roster, structure, and coverage">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ProfileQuickAction to="/team-hr/staff" icon="👥">
                Team directory
              </ProfileQuickAction>
              <ProfileQuickAction to="/team-hr/org-chart" icon="🗂️">
                Org chart
              </ProfileQuickAction>
              <ProfileQuickAction to={teamHrTimeAbsencePath('absence')} icon="📊">
                Absence reports
              </ProfileQuickAction>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { to: teamHrTimeAbsencePath('calendar'), label: 'Leave calendar' },
                { to: teamHrTimeAbsencePath('absence'), label: 'Absence reports' },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="inline-flex min-h-10 items-center rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs font-semibold text-[#134e4a] no-underline hover:bg-teal-100/80"
                >
                  {a.label} →
                </Link>
              ))}
            </div>
          </ProfileOverviewSection>
        </>
      )}
    </HrPageBody>
  );
}
