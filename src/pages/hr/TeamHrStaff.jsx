import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrTeamSummary } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HrCard, HrPageBody } from '../../components/hr/hrPageUi';
import { HrResponsiveTable } from '../../components/hr/HrResponsiveTable';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';

export default function TeamHrStaff() {
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrTeamSummary('team');
    if (!ok || !data?.ok) {
      setSummary(null);
      return { error: data?.error || 'Could not load team staff.', hasData: false };
    }
    setSummary(data);
    return { hasData: true };
  }, []);

  const staff = useMemo(() => summary?.roster || [], [summary?.roster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.displayName, s.jobTitle, s.department, s.employeeNo].join(' ').toLowerCase().includes(q)
    );
  }, [staff, search]);

  if (loading && !staff.length) {
    return (
      <HrPageBody>
        <ProfileMetricSkeleton count={2} />
      </HrPageBody>
    );
  }

  return (
    <HrPageBody>
      {summary?.scopeMode ? (
        <span className="mb-4 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase text-[#134e4a]">
          {summary.scopeMode} view
        </span>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HrCard className="!p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team size</p>
          <p className="text-xl font-black tabular-nums">{summary?.count ?? '—'}</p>
        </HrCard>
        <HrCard className="!p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending leave</p>
          <p className="text-xl font-black tabular-nums text-amber-900">{summary?.pendingLeave ?? 0}</p>
        </HrCard>
      </div>

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <div className="mb-4">
        <ProfileFormField label="Search team" htmlFor="team-staff-search">
          <input
            id="team-staff-search"
            className={HR_FIELD_CLASS}
            placeholder="Search by name, job title, department, or employee number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </ProfileFormField>
      </div>

      <ProfileOverviewSection title="Team members" flush>
        {!loading && !filtered.length ? (
          <ProfileEmptyState title="No team members" />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {filtered.map((s) => (
                <Link
                  key={s.userId}
                  to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}`}
                  className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm no-underline"
                >
                  <p className="font-bold text-slate-900">{s.displayName || s.username}</p>
                  <p className="text-xs text-slate-500">
                    {s.jobTitle || '—'} · {s.department || '—'}
                  </p>
                  <p className="mt-1 text-[10px] uppercase text-slate-400">{s.employeeNo || s.branchId || '—'}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <HrResponsiveTable
                columns={[
                  { key: 'displayName', label: 'Name' },
                  { key: 'jobTitle', label: 'Job' },
                  { key: 'department', label: 'Department' },
                  { key: 'branchId', label: 'Branch' },
                ]}
                rows={filtered.map((s) => ({
                  ...s,
                  displayName: (
                    <Link
                      to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}`}
                      className="font-semibold text-[#134e4a] hover:underline"
                    >
                      {s.displayName || s.username}
                    </Link>
                  ),
                }))}
              />
            </div>
          </>
        )}
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
