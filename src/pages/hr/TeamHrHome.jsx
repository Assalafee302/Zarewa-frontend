import React from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrKpiCard } from '../../components/hr/HrKpiCard';

export default function TeamHrHome() {
  const { data, loading, error, reload } = useHrListLoad(
    async () => {
      const { ok, data: body } = await apiFetch('/api/hr/team/summary?scope=team');
      if (!ok || !body?.ok) throw new Error(body?.error || 'Could not load team summary.');
      return body;
    },
    []
  );

  if (loading) {
    return <p className="text-sm text-slate-500 py-8 text-center">Loading team dashboard…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-800">
        {error.message || 'Could not load team dashboard.'}
        <button type="button" className="ml-3 font-bold underline" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  const s = data || {};

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Branch-scoped team overview — endorsements and coverage only. Salary and bank data are not shown here.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <HrKpiCard label="Branch staff" value={s.count ?? 0} hint="Active team members" tone="teal" to="/team-hr/staff" />
        <HrKpiCard
          label="Leave endorsements"
          value={s.pendingLeave ?? 0}
          hint="Awaiting your endorsement"
          tone={s.pendingLeave > 0 ? 'amber' : 'default'}
          to="/team-hr/requests"
        />
        <HrKpiCard
          label="Loan endorsements"
          value={s.pendingLoan ?? 0}
          hint="Submitted loan requests"
          tone={s.pendingLoan > 0 ? 'amber' : 'default'}
          to="/team-hr/requests"
        />
        <HrKpiCard
          label="Transfer recommendations"
          value={s.pendingTransfer ?? 0}
          hint="Pending recommendations"
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
        <HrKpiCard label="Leave calendar" value="→" hint="Upcoming leave" tone="emerald" to="/team-hr/leave-calendar" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { to: '/team-hr/staff', label: 'View team roster' },
            { to: '/team-hr/attendance', label: 'Review attendance' },
            { to: '/team-hr/requests', label: 'Endorse leave / loan' },
            { to: '/team-hr/incidents', label: 'Submit incident' },
            { to: '/team-hr/transfers', label: 'Recommend transfer' },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="inline-flex items-center rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-[11px] font-bold text-[#134e4a] hover:bg-teal-100/80"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
