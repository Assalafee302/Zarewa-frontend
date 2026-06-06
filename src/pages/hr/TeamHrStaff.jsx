import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrTeamSummary } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrCard, HrEmptyState } from '../../components/hr/hrPageUi';
import { HrResponsiveTable } from '../../components/hr/HrResponsiveTable';

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

  const staff = summary?.roster || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.displayName, s.jobTitle, s.department, s.employeeNo].join(' ').toLowerCase().includes(q)
    );
  }, [staff, search]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Scoped team roster for supervisors and department heads — salary and bank details are never shown here.
        {summary?.scopeMode ? (
          <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase text-[#134e4a]">
            {summary.scopeMode} view
          </span>
        ) : null}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HrCard className="!p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Team size</p>
          <p className="text-xl font-black tabular-nums">{summary?.count ?? '—'}</p>
        </HrCard>
        <HrCard className="!p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Pending leave</p>
          <p className="text-xl font-black tabular-nums text-amber-900">{summary?.pendingLeave ?? 0}</p>
        </HrCard>
      </div>

      <input
        className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
        placeholder="Search team…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {loading && !staff.length ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {!loading && !filtered.length ? (
        <HrEmptyState title="No team members" description="Your scoped team roster will appear here when staff report to you or belong to your department." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filtered.map((s) => (
              <Link
                key={s.userId}
                to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}`}
                className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <p className="font-bold text-slate-900">{s.displayName || s.username}</p>
                <p className="text-xs text-slate-500">{s.jobTitle || '—'} · {s.department || '—'}</p>
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
                  <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(s.userId)}`} className="font-semibold text-[#134e4a] hover:underline">
                    {s.displayName || s.username}
                  </Link>
                ),
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
