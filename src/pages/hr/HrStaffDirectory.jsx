import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
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

function contractBadge(staff) {
  if (!staff) return null;
  const et = String(staff.employmentType || staff.normalized?.taxonomy?.employmentType || '').toLowerCase();
  if (!et.includes('contract') && !et.includes('temp')) return null;
  const end = staff.contractEndIso;
  const today = new Date().toISOString().slice(0, 10);
  if (!end) return { label: 'No contract end', cls: 'border-amber-200 bg-amber-50 text-amber-900' };
  if (end < today) return { label: 'Past contract end', cls: 'border-red-200 bg-red-50 text-red-900' };
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  if (end <= in30.toISOString().slice(0, 10)) return { label: 'Contract ending soon', cls: 'border-orange-200 bg-orange-50 text-orange-900' };
  if (staff.dateJoinedIso) {
    const months = (Date.parse(end) - Date.parse(staff.dateJoinedIso)) / (30.44 * 86400000);
    if (months > 6) return { label: 'Over 6 months', cls: 'border-violet-200 bg-violet-50 text-violet-900' };
  }
  return null;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
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

  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [status, setStatus] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(initialRegisterOpen);
  const [compactTable, setCompactTable] = useState(false);

  useEffect(() => {
    if (initialRegisterOpen) setRegisterOpen(true);
  }, [initialRegisterOpen]);

  const [masterDepartments, setMasterDepartments] = useState([]);

  const isSpecialList = cohort !== 'employees';

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (!s) return false;
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

  const staffPaging = useAppTablePaging(filtered, 20, search, branchId, department, employmentType, status);

  const exportRosterCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'EmployeeNo', 'Branch', 'Department', 'JobTitle', 'Status', 'Joined'];
    if (showSalary) header.push('BaseSalary');
    const lines = filtered.map((s) => {
      const row = [
        s.displayName,
        s.employeeNo,
        s.branchId,
        s.department,
        s.jobTitle,
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
          setBranchId('');
          setDepartment('');
          setEmploymentType('');
          setStatus('');
          await reload({ forceSpinner: true });
          setImportNotice({
            imported,
            updated,
            failed,
            total,
            ok: total > 0,
          });
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
            Imported {importNotice.imported}, updated {importNotice.updated}, failed {importNotice.failed}. Staff
            directory refreshed below.
            {importNotice.total === 0
              ? ' No accounts were created — open Bulk Register Staff again to read row errors.'
              : ' If counts look low, set branch filter to “All branches”.'}
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2 lg:order-2">
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
              Bulk Register Staff
            </button>
          ) : null}
          {canRegister ? (
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#134e4a] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#0f3d39]"
            >
              <UserPlus size={16} aria-hidden />
              Register staff
            </button>
          ) : null}
        </div>
        <div className="relative max-w-md flex-1 lg:order-1">
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
          {filtered.length} of {staff.length} record{staff.length === 1 ? '' : 's'}
          {staff.length === 0 && !loading && !error ? ' — try “All statuses” or refresh the page' : ''}
        </p>
      </div>

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

      {!error ? (
        <>
        <div className="space-y-3 md:hidden">
          {loading && !staff.length ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Loading staff…</p>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No staff match these filters.</p>
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
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Staff ID</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{s.employeeNo || '—'}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Branch</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{s.branchId || s.normalized?.branchId || '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-bold uppercase tracking-wide text-slate-400">Job</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{s.jobTitle || '—'} · {s.department || '—'}</dd>
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
              <AppTableTh>Group</AppTableTh>
              {showSalary ? (
                <AppTableTh align="right">
                  <span className="inline-flex items-center gap-1">
                    🔒 Base salary
                  </span>
                </AppTableTh>
              ) : null}
              <AppTableTh>Joined</AppTableTh>
              <AppTableTh>Status</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {loading && !staff.length ? (
                <HrTableLoadingRow colSpan={showSalary ? 9 : 8} message="Loading staff…" />
              ) : null}
              {!loading && filtered.length === 0 ? (
                <HrTableEmptyRow colSpan={showSalary ? 9 : 8} message="No staff match these filters." />
              ) : null}
              {staffPaging.slice.map((s) => (
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
                    <AppTableTd>{s.branchId || s.normalized?.branchId || '—'}</AppTableTd>
                    <AppTableTd>{s.department || '—'}</AppTableTd>
                    <AppTableTd>{s.jobTitle || '—'}</AppTableTd>
                    <AppTableTd>{payrollGroupLabel(s)}</AppTableTd>
                    {showSalary ? (
                      <AppTableTd align="right">
                        {s.compensationRedacted ? '—' : formatNgn(s.baseSalaryNgn)}
                      </AppTableTd>
                    ) : null}
                    <AppTableTd>{s.dateJoinedIso || '—'}</AppTableTd>
                    <AppTableTd truncate={false}>
                      <HrStatusBadge status={s.status} variant="staff" />
                      {(() => {
                        const b = contractBadge(s);
                        return b ? (
                          <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${b.cls}`}>
                            {b.label}
                          </span>
                        ) : null;
                      })()}
                    </AppTableTd>
                  </AppTableTr>
                ))
              }
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
