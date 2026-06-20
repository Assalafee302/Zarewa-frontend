import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Search, UserPlus } from 'lucide-react';
import { HrFormModal } from '../../components/hr/HrFormModal';
import { HrStaffRegisterForm } from '../../components/hr/HrStaffRegisterForm';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrStaff, canViewOrgSensitiveHr, canBulkImportStaff } from '../../lib/hrAccess';
import { HrBulkStaffImportModal } from '../../components/hr/HrBulkStaffImportModal';
import { HrStaffDuplicateCleanupPanel } from '../../components/hr/HrStaffDuplicateCleanupPanel';
import { formatNgn, payrollGroupLabel } from '../../lib/hrFormat';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  branchNameMap,
  computeDirectoryKpis,
  contractBadge,
  filterStaffList,
  probationBadge,
  profilePct,
  profilePctBadge,
  QUICK_FILTERS,
  resolveBranchLabel,
  SORT_OPTIONS,
  sortStaffList,
} from '../../lib/hrStaffDirectoryUi';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import { useAppTablePaging } from '../../lib/appDataTable';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrEmptyState } from '../../components/hr/hrPageUi';
import { HR_BTN_PRIMARY } from '../../components/hr/hrFormStyles';

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function StaffBadges({ staff }) {
  const contract = contractBadge(staff);
  const probation = probationBadge(staff);
  const pct = profilePct(staff);
  const pctBadge = profilePctBadge(pct);
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {probation ? (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${probation.cls}`}>
          {probation.label}
        </span>
      ) : null}
      {contract ? (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${contract.cls}`}>
          {contract.label}
        </span>
      ) : null}
      {pct < 90 ? (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${pctBadge.cls}`}>
          Profile {pctBadge.label}
        </span>
      ) : null}
    </div>
  );
}

export default function HrStaffDirectory({
  staffBasePath = HR_EMPLOYEES,
  cohort = 'employees',
  listTitle = 'Staff directory',
  initialRegisterOpen = false,
} = {}) {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const showSalary = canViewOrgSensitiveHr(perms);
  const canRegister = canManageHrStaff(perms);
  const canBulkImport = canBulkImportStaff(perms);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);
  const branchNames = useMemo(() => branchNameMap(branches), [branches]);

  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [status, setStatus] = useState('active');
  const [quickFilter, setQuickFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [registerOpen, setRegisterOpen] = useState(initialRegisterOpen);
  const [compactTable, setCompactTable] = useState(false);

  useEffect(() => {
    if (initialRegisterOpen) setRegisterOpen(true);
  }, [initialRegisterOpen]);

  const [masterDepartments, setMasterDepartments] = useState([]);
  const isSpecialList = cohort !== 'employees';
  const includeInactive = status === 'all' || status === 'inactive';

  const { loading, error, reload } = useHrListLoad(async () => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('includeInactive', '1');
    if (cohort) params.set('cohort', cohort);
    const q = params.toString() ? `?${params.toString()}` : '';
    const [staffRes, deptRes] = await Promise.all([
      apiFetch(`/api/hr/staff${q}`),
      fetchHrDepartments(false),
    ]);
    if (!staffRes.ok || !staffRes.data?.ok) {
      setStaff([]);
      const detail = staffRes.data?.error || (staffRes.ok ? 'Staff list response was invalid.' : `HTTP ${staffRes.status}`);
      return { error: detail || 'Could not load staff directory.', hasData: false };
    }
    const rows = Array.isArray(staffRes.data.staff) ? staffRes.data.staff.filter((s) => s && s.userId) : [];
    setStaff(rows);
    if (deptRes.ok && deptRes.data?.ok) setMasterDepartments(deptRes.data.departments || []);
    return { hasData: true };
  }, [includeInactive, cohort]);

  const departments = useMemo(() => {
    const names = new Set([
      ...masterDepartments.map((d) => d.name),
      ...staff.map((s) => s.department).filter(Boolean),
    ]);
    return [...names].sort((a, b) => String(a).localeCompare(String(b)));
  }, [masterDepartments, staff]);
  const employmentTypes = useMemo(
    () => uniqueSorted(staff.map((s) => s.employmentType || s.normalized?.taxonomy?.employmentType)),
    [staff]
  );

  const kpis = useMemo(() => computeDirectoryKpis(staff), [staff]);

  const filtered = useMemo(() => {
    const rows = filterStaffList(staff, {
      search,
      branchId,
      department,
      employmentType,
      status: status === 'all' ? '' : status,
      quickFilter,
    });
    return sortStaffList(rows, sortKey, branchNames);
  }, [staff, search, branchId, department, employmentType, status, quickFilter, sortKey, branchNames]);

  const staffPaging = useAppTablePaging(filtered, 20, search, branchId, department, employmentType, status, quickFilter, sortKey);

  const exportRosterCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'EmployeeNo', 'Branch', 'Department', 'JobTitle', 'LineManager', 'ProfilePct', 'Status', 'Joined'];
    if (showSalary) header.push('BaseSalary');
    const lines = filtered.map((s) => {
      const row = [
        s.displayName,
        s.employeeNo,
        resolveBranchLabel(s, branchNames),
        s.department,
        s.jobTitle,
        s.lineManagerDisplayName || s.lineManagerUserId || '',
        profilePct(s),
        s.status,
        s.dateJoinedIso,
      ];
      if (showSalary) row.push(s.compensationRedacted ? '' : s.baseSalaryNgn);
      return row.map(esc).join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setBranchId('');
    setDepartment('');
    setEmploymentType('');
    setStatus('active');
    setQuickFilter('');
  };

  return (
    <div className="space-y-6">
      <HrFormModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register new staff"
        size="xl"
      >
        <HrStaffRegisterForm
          onSuccess={(newUserId) => {
            setRegisterOpen(false);
            navigate(`${staffBasePath}/${encodeURIComponent(newUserId)}`);
          }}
          onCancel={() => setRegisterOpen(false)}
        />
      </HrFormModal>

      <HrBulkStaffImportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={async (data) => {
          const imported = Number(data?.imported) || 0;
          const updated = Number(data?.updated) || 0;
          const failed = Number(data?.failed) || 0;
          const total = imported + updated;
          clearFilters();
          await reload({ forceSpinner: true });
          setImportNotice({ imported, updated, failed, total, ok: total > 0 });
        }}
      />

      {canBulkImport ? (
        <HrStaffDuplicateCleanupPanel
          onCleaned={async () => {
            setImportNotice(null);
            await reload({ forceSpinner: true });
          }}
        />
      ) : null}

      {importNotice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            importNotice.ok
              ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
              : 'border-amber-100 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-bold">
            {importNotice.ok ? 'Staff import completed' : 'Staff import finished with issues'}
          </p>
          <p className="mt-1 text-xs">
            Imported {importNotice.imported}, updated {importNotice.updated}, failed {importNotice.failed}.
            {importNotice.total === 0
              ? ' No accounts were created — open Bulk Register Staff again to read row errors.'
              : ' Directory refreshed below.'}
          </p>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="mt-2 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {isSpecialList ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
          <p className="font-bold">{listTitle}</p>
          <p className="mt-1 text-xs text-violet-900/80">
            These people are not branch employees — they do not appear in the main employee directory and are excluded from
            daily attendance.
          </p>
        </div>
      ) : null}

      {!isSpecialList ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HrKpiCard label="Active staff" value={kpis.active} hint={`${kpis.total} total in scope`} />
          <HrKpiCard
            label="Incomplete profiles"
            value={kpis.incomplete}
            tone={kpis.incomplete > 0 ? 'amber' : 'default'}
            onClick={() => setQuickFilter('incomplete')}
          />
          <HrKpiCard
            label="On probation"
            value={kpis.onProbation}
            tone={kpis.onProbation > 0 ? 'teal' : 'default'}
            onClick={() => setQuickFilter('probation')}
          />
          <HrKpiCard
            label="Contracts expiring"
            value={kpis.contractsExpiring}
            tone={kpis.contractsExpiring > 0 ? 'amber' : 'default'}
            onClick={() => setQuickFilter('contract')}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, job, department, manager…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportRosterCsv}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600">
              <input type="checkbox" checked={compactTable} onChange={(e) => setCompactTable(e.target.checked)} />
              Compact
            </label>
            {canBulkImport ? (
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#134e4a] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50"
              >
                Bulk register
              </button>
            ) : null}
            {canRegister ? (
              <button type="button" onClick={() => setRegisterOpen(true)} className={`${HR_BTN_PRIMARY} gap-2`}>
                <UserPlus size={16} aria-hidden />
                Register staff
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 tabular-nums">
          Showing {filtered.length} of {staff.length} record{staff.length === 1 ? '' : 's'}
        </p>
      </div>

      {!isSpecialList ? (
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => setQuickFilter(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                quickFilter === f.id
                  ? 'border-[#134e4a] bg-[#134e4a] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!isSpecialList ? (
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
        ) : null}
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
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          <option value="all">All statuses</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              Sort: {o.label}
            </option>
          ))}
        </select>
        {(search || branchId || department || employmentType || quickFilter || status !== 'active') ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {!error ? (
        <>
          <div className="space-y-3 md:hidden">
            {loading && !staff.length ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Loading staff…
              </p>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <HrEmptyState
                title="No staff match these filters"
                description="Try clearing filters or widening the status to include inactive staff."
                action={
                  canRegister ? (
                    <button type="button" onClick={() => setRegisterOpen(true)} className={HR_BTN_PRIMARY}>
                      Register staff
                    </button>
                  ) : (
                    <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase text-slate-700">
                      Clear filters
                    </button>
                  )
                }
              />
            ) : null}
            {staffPaging.slice.map((s) => (
              <article key={s.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`${staffBasePath}/${encodeURIComponent(s.userId)}`}
                    className="text-sm font-bold text-[#134e4a] hover:underline"
                  >
                    {s.displayName || s.username}
                  </Link>
                  <HrStatusBadge status={s.status} variant="staff" />
                </div>
                <StaffBadges staff={s} />
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-wide text-slate-400">Staff ID</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{s.employeeNo || '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wide text-slate-400">Branch</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{resolveBranchLabel(s, branchNames)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-bold uppercase tracking-wide text-slate-400">Job</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {s.jobTitle || '—'} · {s.department || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-bold uppercase tracking-wide text-slate-400">Line manager</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {s.lineManagerDisplayName || s.lineManagerUserId || '—'}
                    </dd>
                  </div>
                  {showSalary ? (
                    <div className="col-span-2">
                      <dt className="font-bold uppercase tracking-wide text-slate-400">Base salary</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">
                        {s.compensationRedacted ? '—' : formatNgn(s.baseSalaryNgn)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <AppTableWrap>
              <AppTable role="numeric" className={compactTable ? 'text-xs' : undefined}>
                <AppTableThead>
                  <AppTableTh>Name</AppTableTh>
                  <AppTableTh>Staff ID</AppTableTh>
                  <AppTableTh>Branch</AppTableTh>
                  <AppTableTh>Department</AppTableTh>
                  <AppTableTh>Job title</AppTableTh>
                  <AppTableTh>Manager</AppTableTh>
                  <AppTableTh>Profile</AppTableTh>
                  <AppTableTh>Group</AppTableTh>
                  {showSalary ? (
                    <AppTableTh align="right">
                      <span className="inline-flex items-center gap-1">
                        <Lock size={12} aria-hidden />
                        Base salary
                      </span>
                    </AppTableTh>
                  ) : null}
                  <AppTableTh>Joined</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {loading && !staff.length ? (
                    <HrTableLoadingRow colSpan={showSalary ? 11 : 10} message="Loading staff…" />
                  ) : null}
                  {!loading && filtered.length === 0 ? (
                    <HrTableEmptyRow colSpan={showSalary ? 11 : 10} message="No staff match these filters." />
                  ) : null}
                  {staffPaging.slice.map((s) => {
                    const pct = profilePct(s);
                    const pctBadge = profilePctBadge(pct);
                    const contract = contractBadge(s);
                    const probation = probationBadge(s);
                    return (
                      <AppTableTr key={s.userId}>
                        <AppTableTd>
                          <Link
                            to={`${staffBasePath}/${encodeURIComponent(s.userId)}`}
                            className="font-semibold text-[#134e4a] hover:underline"
                          >
                            {s.displayName || s.username}
                          </Link>
                        </AppTableTd>
                        <AppTableTd>{s.employeeNo || '—'}</AppTableTd>
                        <AppTableTd>{resolveBranchLabel(s, branchNames)}</AppTableTd>
                        <AppTableTd>{s.department || '—'}</AppTableTd>
                        <AppTableTd>{s.jobTitle || '—'}</AppTableTd>
                        <AppTableTd>{s.lineManagerDisplayName || s.lineManagerUserId || '—'}</AppTableTd>
                        <AppTableTd>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${pctBadge.cls}`}>
                            {pct}%
                          </span>
                        </AppTableTd>
                        <AppTableTd>{payrollGroupLabel(s)}</AppTableTd>
                        {showSalary ? (
                          <AppTableTd align="right">
                            {s.compensationRedacted ? '—' : formatNgn(s.baseSalaryNgn)}
                          </AppTableTd>
                        ) : null}
                        <AppTableTd>{s.dateJoinedIso || '—'}</AppTableTd>
                        <AppTableTd truncate={false}>
                          <HrStatusBadge status={s.status} variant="staff" />
                          {probation ? (
                            <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${probation.cls}`}>
                              {probation.label}
                            </span>
                          ) : null}
                          {contract ? (
                            <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${contract.cls}`}>
                              {contract.label}
                            </span>
                          ) : null}
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
          {staffPaging.total > staffPaging.pageSize ? (
            <AppTablePager
              showingFrom={staffPaging.showingFrom}
              showingTo={staffPaging.showingTo}
              total={staffPaging.total}
              hasPrev={staffPaging.hasPrev}
              hasNext={staffPaging.hasNext}
              onPrev={staffPaging.goPrev}
              onNext={staffPaging.goNext}
            />
          ) : null}
        </>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
    </div>
  );
}
