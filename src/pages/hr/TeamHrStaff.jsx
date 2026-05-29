import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function TeamHrStaff() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { error: data?.error || 'Could not load team staff.', hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.displayName, s.jobTitle, s.department, s.employeeNo].join(' ').toLowerCase().includes(q)
    );
  }, [staff, search]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Branch team roster — no salary or bank details are shown here.</p>
      <input
        className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm"
        placeholder="Search team…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Name</AppTableTh>
              <AppTableTh>Job</AppTableTh>
              <AppTableTh>Department</AppTableTh>
              <AppTableTh>Status</AppTableTh>
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {filtered.map((s) => (
              <AppTableTr key={s.userId}>
                <AppTableTd>
                  <span className="font-semibold text-slate-900">{s.displayName || s.username}</span>
                  <span className="block text-xs text-slate-500">{s.employeeNo || '—'}</span>
                </AppTableTd>
                <AppTableTd>{s.jobTitle || '—'}</AppTableTd>
                <AppTableTd>{s.department || '—'}</AppTableTd>
                <AppTableTd className="capitalize">{s.status || 'active'}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
