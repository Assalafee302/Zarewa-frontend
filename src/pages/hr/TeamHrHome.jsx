import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
  ProfileQuickAction,
} from '../../components/profile/profileOverviewUi';

export default function TeamHrHome() {
  const [summary, setSummary] = useState(null);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data: body } = await apiFetch('/api/hr/team/summary?scope=team');
    if (!ok || !body?.ok) {
      setSummary(null);
      return { error: body?.error || 'Could not load team summary.', hasData: false };
    }
    setSummary(body);
    return { hasData: true };
  }, []);

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

  const s = summary || {};

  return (
    <HrPageBody>
      <HrPageIntro
        title="Team dashboard"
        description="Branch-scoped overview — endorsements and coverage only. Salary and bank data are not shown here."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <HrKpiCard label="Branch staff" value={s.count ?? 0} hint="Active team members" tone="teal" to="/team-hr/staff" />
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

      <ProfileOverviewSection title="Quick actions" subtitle="Common manager tasks for your branch">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <ProfileQuickAction to="/team-hr/staff" icon="👥">
            Team roster
          </ProfileQuickAction>
          <ProfileQuickAction to="/manager?inbox=attendance" icon="✓">
            Attendance
          </ProfileQuickAction>
          <ProfileQuickAction to={teamHrTimeAbsencePath('endorsements')} icon="📋">
            Endorsements
          </ProfileQuickAction>
          <ProfileQuickAction to="/team-hr/incidents" icon="⚠️">
            Incidents
          </ProfileQuickAction>
          <ProfileQuickAction to="/team-hr/transfers" icon="↔️">
            Transfers
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
              className="inline-flex min-h-10 items-center rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-[11px] font-bold text-[#134e4a] no-underline hover:bg-teal-100/80"
            >
              {a.label} →
            </Link>
          ))}
        </div>
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
