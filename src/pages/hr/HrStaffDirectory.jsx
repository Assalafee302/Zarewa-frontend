import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canViewOrgSensitiveHr } from '../../lib/hrAccess';
import { formatNgn, payrollGroupLabel } from '../../lib/hrFormat';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

export default function HrStaffDirectory() {
  const ws = useWorkspace();
  const showSalary = canViewOrgSensitiveHr(ws?.permissions);
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [status, setStatus] = useState('active');
  const [includeInactive, setIncludeInactive] = useState(false);

  const { loading, error } = useHrListLoad(async () => {
    const q = includeInactive ? '?includeInactive=1' : '';
    const { ok, data } = await apiFetch(`/api/hr/staff${q}`);
    if (!ok || !data?.ok) {
      setStaff([]);
      return { error: data?.error || 'Could not load staff directory.', hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, [includeInactive]);

  const departments = useMemo(() => uniqueSorted(staff.map((s) => s.department)), [staff]);
  const employmentTypes = useMemo(
    () => uniqueSorted(staff.map((s) => s.employmentType || s.normalized?.taxonomy?.employmentType)),
    [staff]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (status === 'active' && String(s.status) !== 'active') return false;
      if (status === 'inactive' && String(s.status) === 'active') return false;
      if (branchId && String(s.branchId || s.normalized?.branchId) !== branchId) return false;
      if (department && String(s.department || '') !== department) return false;
      if (employmentType) {
        const et = String(s.employmentType || s.normalized?.taxonomy?.employmentType || '');
        if (et !== employmentType) return false;
      }
      if (!q) return true;
      const hay = [
        s.displayName,
        s.username,
        s.employeeNo,
        s.jobTitle,
        s.department,
        s.branchId,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [staff, search, branchId, department, employmentType, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, job, department…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15"
          />
        </div>
        <p className="text-xs font-medium text-slate-500 tabular-nums">
          {filtered.length} of {staff.length} staff
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          aria-label="Filter by branch"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          aria-label="Filter by employment type"
        >
          <option value="">All employment types</option>
          {employmentTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include inactive in fetch
        </label>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading staff…</p> : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading || staff.length > 0 ? (
        !error ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Name</AppTableTh>
              <AppTableTh>Staff ID</AppTableTh>
              <AppTableTh>Branch</AppTableTh>
              <AppTableTh>Department</AppTableTh>
              <AppTableTh>Job title</AppTableTh>
              <AppTableTh>Group</AppTableTh>
              {showSalary ? <AppTableTh>Base salary</AppTableTh> : null}
              <AppTableTh>Joined</AppTableTh>
              <AppTableTh>Status</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {filtered.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={showSalary ? 9 : 8} align="center">
                    <span className="text-slate-500 py-4 block">No staff match these filters.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                filtered.map((s) => (
                  <AppTableTr key={s.userId}>
                    <AppTableTd>
                      <Link
                        to={`/hr/staff/${encodeURIComponent(s.userId)}`}
                        className="font-semibold text-[#134e4a] hover:underline"
                      >
                        {s.displayName || s.username}
                      </Link>
                    </AppTableTd>
                    <AppTableTd>{s.employeeNo || '—'}</AppTableTd>
                    <AppTableTd>{s.branchId || s.normalized?.branchId || '—'}</AppTableTd>
                    <AppTableTd>{s.department || '—'}</AppTableTd>
                    <AppTableTd>{s.jobTitle || '—'}</AppTableTd>
                    <AppTableTd>{payrollGroupLabel(s)}</AppTableTd>
                    {showSalary ? (
                      <AppTableTd>
                        {s.compensationRedacted ? '—' : formatNgn(s.baseSalaryNgn)}
                      </AppTableTd>
                    ) : null}
                    <AppTableTd>{s.dateJoinedIso || '—'}</AppTableTd>
                    <AppTableTd>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          s.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status || '—'}
                      </span>
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
        ) : null
      ) : null}
    </div>
  );
}
