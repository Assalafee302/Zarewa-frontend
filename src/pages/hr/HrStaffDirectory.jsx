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
import { formatNgn, payrollGroupLabel } from '../../lib/hrFormat';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function contractBadge(staff) {
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

export default function HrStaffDirectory({ staffBasePath = HR_EMPLOYEES, initialRegisterOpen = false } = {}) {
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
  const [status, setStatus] = useState('active');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(initialRegisterOpen);

  useEffect(() => {
    if (initialRegisterOpen) setRegisterOpen(true);
  }, [initialRegisterOpen]);

  const [masterDepartments, setMasterDepartments] = useState([]);

  const { loading, error, reload } = useHrListLoad(async () => {
    const q = includeInactive ? '?includeInactive=1' : '';
    const [staffRes, deptRes] = await Promise.all([
      apiFetch(`/api/hr/staff${q}`),
      fetchHrDepartments(false),
    ]);
    if (!staffRes.ok || !staffRes.data?.ok) {
      setStaff([]);
      return { error: staffRes.data?.error || 'Could not load staff directory.', hasData: false };
    }
    setStaff(staffRes.data.staff || []);
    if (deptRes.ok && deptRes.data?.ok) setMasterDepartments(deptRes.data.departments || []);
    return { hasData: true };
  }, [includeInactive]);

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
          setStatus('active');
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2 lg:order-2">
          {canBulkImport ? (
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-teal-50"
            >
              Bulk Register Staff
            </button>
          ) : null}
          {canRegister ? (
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#0f3d39]"
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
                      {(() => {
                        const b = contractBadge(s);
                        return b ? (
                          <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${b.cls}`}>
                            {b.label}
                          </span>
                        ) : null;
                      })()}
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
