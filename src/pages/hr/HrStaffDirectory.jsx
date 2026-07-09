import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Filter, Lock, Search, UserPlus } from 'lucide-react';
import { HrFormModal } from '../../components/hr/HrFormModal';
import { HrStaffRegisterForm } from '../../components/hr/HrStaffRegisterForm';
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
  docExpiryBadge,
  probationBadge,
  profilePct,
  profilePctBadge,
  QUICK_FILTERS,
  resolveBranchLabel,
  SORT_OPTIONS,
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
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrEmptyState } from '../../components/hr/hrPageUi';
import { HR_BTN_PRIMARY } from '../../components/hr/hrFormStyles';
import { HrStaffAvatar } from '../../components/hr/HrStaffAvatar';
import { HrStaffDirectoryBulkBar } from '../../components/hr/HrStaffDirectoryBulkBar';
import { HrStaffQuickPreviewSlideOver } from '../../components/hr/HrStaffQuickPreviewSlideOver';
import {
  HrStaffDirectoryColumnPicker,
  loadVisibleColumns,
} from '../../components/hr/HrStaffDirectoryColumnPicker';
import {
  deleteHrDirectoryView,
  fetchHrDirectoryViews,
  fetchHrStaffDirectory,
  saveHrDirectoryView,
} from '../../lib/hrStaffDirectoryApi';
import {
  deleteDirectoryView,
  loadSavedDirectoryViews,
  saveDirectoryView,
} from '../../lib/hrStaffDirectorySavedViews';

function SortableTh({ label, sortId, sortKey, sortDir, onSort, align }) {
  const active = sortKey === sortId;
  const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <AppTableTh align={align}>
      <button
        type="button"
        className={`font-bold uppercase tracking-wide ${active ? 'text-[#134e4a]' : 'text-slate-500 hover:text-slate-800'}`}
        onClick={() => onSort(sortId)}
      >
        {label}
        {arrow}
      </button>
    </AppTableTh>
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function StaffBadges({ staff }) {
  const contract = contractBadge(staff);
  const probation = probationBadge(staff);
  const doc = docExpiryBadge(staff);
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
      {doc ? (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${doc.cls}`}>
          {doc.label}
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
  initialQuickFilter = '',
  teamMode = false,
} = {}) {
  const navigate = useNavigate();
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const showSalary = teamMode ? false : canViewOrgSensitiveHr(perms);
  const canRegister = teamMode ? false : canManageHrStaff(perms);
  const canBulkImport = teamMode ? false : canBulkImportStaff(perms);
  const canBulkManage = teamMode ? false : canManageHrStaff(perms);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const [bulkNotice, setBulkNotice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [serverKpis, setServerKpis] = useState(null);
  const [facets, setFacets] = useState({ departments: [], employmentTypes: [], managers: [] });
  const [lineManagerUserId, setLineManagerUserId] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleColumns(showSalary));
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);
  const branchNames = useMemo(() => branchNameMap(branches), [branches]);

  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [status, setStatus] = useState('active');
  const [quickFilter, setQuickFilter] = useState(initialQuickFilter || '');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [registerOpen, setRegisterOpen] = useState(initialRegisterOpen);
  const [compactTable, setCompactTable] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [previewStaff, setPreviewStaff] = useState(null);
  const [masterDepartments, setMasterDepartments] = useState([]);
  const isSpecialList = cohort !== 'employees';
  const includeInactive = status === 'all' || status === 'inactive' || quickFilter === 'exited-retired';
  const showSavedViews = !isSpecialList && !teamMode;

  useEffect(() => {
    setVisibleColumns(loadVisibleColumns(showSalary));
  }, [showSalary]);

  useEffect(() => {
    if (teamMode) return undefined;
    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchHrDirectoryViews();
      if (cancelled) return;
      if (ok && data?.ok && Array.isArray(data.views)) {
        setSavedViews(data.views);
        return;
      }
      setSavedViews(loadSavedDirectoryViews());
    })();
    return () => {
      cancelled = true;
    };
  }, [teamMode]);

  useEffect(() => {
    if (initialRegisterOpen) setRegisterOpen(true);
  }, [initialRegisterOpen]);

  useEffect(() => {
    if (initialQuickFilter) setQuickFilter(initialQuickFilter);
  }, [initialQuickFilter]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, branchId, department, employmentType, status, quickFilter, sortKey, sortDir, lineManagerUserId, cohort, includeInactive]);

  const directoryParams = useMemo(
    () => ({
      cohort,
      includeInactive: includeInactive ? '1' : undefined,
      page,
      pageSize,
      search: debouncedSearch || undefined,
      branchId: branchId || undefined,
      department: department || undefined,
      employmentType: employmentType || undefined,
      status: status === 'all' ? 'all' : status,
      quickFilter: quickFilter || undefined,
      lineManagerUserId: lineManagerUserId || undefined,
      sortKey,
      sortDir,
    }),
    [cohort, includeInactive, page, pageSize, debouncedSearch, branchId, department, employmentType, status, quickFilter, lineManagerUserId, sortKey, sortDir]
  );

  const { loading, error, reload } = useHrListLoad(async () => {
    const dirRes = await fetchHrStaffDirectory(directoryParams);
    if (!dirRes.ok || !dirRes.data?.ok) {
      setStaff([]);
      setTotal(0);
      const detail = dirRes.data?.error || (dirRes.ok ? 'Directory response was invalid.' : `HTTP ${dirRes.status}`);
      return { error: detail || 'Could not load staff directory.', hasData: false };
    }
    const rows = Array.isArray(dirRes.data.staff) ? dirRes.data.staff.filter((s) => s && s.userId) : [];
    setStaff(rows);
    setTotal(Number(dirRes.data.total) || rows.length);
    setServerKpis(dirRes.data.kpis || null);
    setFacets(dirRes.data.facets || { departments: [], employmentTypes: [], managers: [] });
    return { hasData: true };
  }, [directoryParams]);

  useEffect(() => {
    let cancelled = false;
    fetchHrDepartments(false).then(({ ok, data }) => {
      if (cancelled || !ok || !data?.ok) return;
      setMasterDepartments(data.departments || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => {
    const names = new Set([
      ...facets.departments,
      ...masterDepartments.map((d) => d.name),
    ]);
    return [...names].sort((a, b) => String(a).localeCompare(String(b)));
  }, [facets.departments, masterDepartments]);
  const employmentTypes = useMemo(
    () => uniqueSorted([...facets.employmentTypes]),
    [facets.employmentTypes]
  );

  const kpis = useMemo(() => computeDirectoryKpis(staff, serverKpis), [staff, serverKpis]);

  const pageSlice = staff;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total ? (page - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(page * pageSize, total);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelected = (userId) => {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const togglePageSelected = () => {
    const pageIds = pageSlice.map((s) => s.userId);
    const allOnPage = pageIds.every((id) => selectedIds.includes(id));
    if (allOnPage) setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    else setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  };

  const applySavedView = (view) => {
    const s = view.snapshot || {};
    setSearch(s.search || '');
    setBranchId(s.branchId || '');
    setDepartment(s.department || '');
    setEmploymentType(s.employmentType || '');
    setStatus(s.status || 'active');
    setQuickFilter(s.quickFilter || '');
    setLineManagerUserId(s.lineManagerUserId || '');
    setSortKey(s.sortKey || 'name');
    setSortDir(s.sortDir || 'asc');
  };

  const persistCurrentView = async () => {
    const snapshot = {
      search,
      branchId,
      department,
      employmentType,
      status,
      quickFilter,
      lineManagerUserId,
      sortKey,
      sortDir,
    };
    const { ok, data } = await saveHrDirectoryView({ name: viewName, snapshot });
    if (ok && data?.ok) {
      setSavedViews(data.views || []);
      setViewName('');
      return;
    }
    const r = saveDirectoryView(viewName, snapshot);
    if (r.ok) {
      setSavedViews(r.views);
      setViewName('');
    }
  };

  const removeSavedView = async (view) => {
    if (!window.confirm(`Delete saved view "${view.name}"?`)) return;
    if (view.id) {
      const { ok, data } = await deleteHrDirectoryView(view.id);
      if (ok && data?.ok) {
        setSavedViews(data.views || []);
        return;
      }
    }
    setSavedViews(deleteDirectoryView(view.name));
  };

  const visibleColCount =
    1 +
    (canBulkManage ? 1 : 0) +
    [...visibleColumns].filter((id) => id !== 'salary' || showSalary).length;

  const exportRosterCsv = async () => {
    const { ok, data } = await fetchHrStaffDirectory({ ...directoryParams, page: 1, pageSize: 5000 });
    const rows = ok && data?.ok && Array.isArray(data.staff) ? data.staff : staff;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'EmployeeNo', 'Branch', 'Department', 'JobTitle', 'LineManager', 'ProfilePct', 'Status', 'Joined', 'DocExpiry'];
    if (showSalary) header.push('BaseSalary');
    const lines = rows.map((s) => {
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
        s.docExpirySummary?.nextExpiryIso || '',
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
    setLineManagerUserId('');
    setSelectedIds([]);
    setPage(1);
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

      {bulkNotice ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Bulk update: {bulkNotice.updated} updated, {bulkNotice.failed} failed.
          </p>
          <button type="button" className="mt-1 text-xs font-bold uppercase text-[#134e4a] hover:underline" onClick={() => setBulkNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {canBulkManage && !isSpecialList ? (
        <HrStaffDirectoryBulkBar
          selectedIds={selectedIds}
          staff={staff}
          branches={branches}
          onClear={() => setSelectedIds([])}
          onDone={async (data) => {
            setBulkNotice(data);
            setSelectedIds([]);
            await reload({ forceSpinner: true });
          }}
        />
      ) : null}

      {showSavedViews && savedViews.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-400">Saved views</span>
          {savedViews.map((v) => (
            <span key={v.id || v.name} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => applySavedView(v)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#134e4a]/30"
              >
                {v.name}
              </button>
              <button
                type="button"
                onClick={() => removeSavedView(v)}
                className="text-[10px] font-bold text-slate-400 hover:text-red-600"
                aria-label={`Delete view ${v.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {showSavedViews ? (
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="Save current filters as…"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs min-w-[180px]"
          />
          <button
            type="button"
            onClick={persistCurrentView}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Save view
          </button>
        </div>
      ) : null}

      {!isSpecialList ? (
        <div className="sticky top-14 z-10 -mx-1 rounded-xl border border-slate-100/80 bg-white/95 px-1 py-3 backdrop-blur-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            label="Probation ending"
            value={kpis.probationEnding}
            tone={kpis.probationEnding > 0 ? 'amber' : 'default'}
            onClick={() => setQuickFilter('probation-ending')}
          />
          <HrKpiCard
            label="Contracts expiring"
            value={kpis.contractsExpiring}
            tone={kpis.contractsExpiring > 0 ? 'amber' : 'default'}
            onClick={() => setQuickFilter('contract')}
          />
          <HrKpiCard
            label="Docs expiring"
            value={kpis.docExpiring ?? 0}
            tone={(kpis.docExpiring ?? 0) > 0 ? 'red' : 'default'}
            onClick={() => setQuickFilter('doc-expiry')}
          />
        </div>
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
            <HrStaffDirectoryColumnPicker
              visible={visibleColumns}
              showSalary={showSalary}
              onChange={setVisibleColumns}
            />
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
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5">
              {[
                { id: 'table', label: 'Table' },
                { id: 'cards', label: 'Cards' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                    viewMode === m.id ? 'bg-[#134e4a] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
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
          Showing {showingFrom}–{showingTo} of {total} record{total === 1 ? '' : 's'}
        </p>
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 md:hidden"
        onClick={() => setMobileFiltersOpen((v) => !v)}
      >
        <Filter size={14} aria-hidden />
        {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
      </button>

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

      <div className={`flex flex-wrap gap-2 ${mobileFiltersOpen ? '' : 'hidden md:flex'}`}>
        {!isSpecialList && !teamMode ? (
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
        {!isSpecialList && !teamMode ? (
          <select
            value={lineManagerUserId}
            onChange={(e) => setLineManagerUserId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 min-w-[160px]"
            aria-label="Filter by line manager"
          >
            <option value="">All managers</option>
            {facets.managers.map((m) => (
              <option key={m.userId} value={m.userId}>
                Reports to {m.displayName}
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
        {(search || branchId || department || employmentType || quickFilter || lineManagerUserId || status !== 'active') ? (
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
          {viewMode === 'table' ? (
          <div className="space-y-3 md:hidden">
            {loading && !staff.length ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Loading staff…
              </p>
            ) : null}
            {!loading && total === 0 ? (
              <HrEmptyState
                title="No staff match these filters"
                description={
                  quickFilter === 'exited-retired'
                    ? 'No staff are marked exited or retired yet. Update employment status or run a separation on staff profiles.'
                    : 'Try clearing filters or widening the status to include inactive staff.'
                }
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
            {pageSlice.map((s) => (
              <article key={s.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {canBulkManage ? (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.includes(s.userId)}
                      onChange={() => toggleSelected(s.userId)}
                      aria-label={`Select ${s.displayName || s.username}`}
                    />
                  ) : null}
                  <HrStaffAvatar staff={s} />
                  <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`${staffBasePath}/${encodeURIComponent(s.userId)}${s.docExpirySummary?.nextExpiryIso ? '?tab=documents' : ''}`}
                    className="text-sm font-bold text-[#134e4a] hover:underline"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        setPreviewStaff(s);
                      }
                    }}
                  >
                    {s.displayName || s.username}
                  </Link>
                  <HrStatusBadge status={s.status} variant="staff" />
                </div>
                <StaffBadges staff={s} />
                  </div>
                </div>
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
          ) : null}

          <div className={viewMode === 'cards' ? 'space-y-2' : 'hidden md:block'}>
            {viewMode === 'cards' ? (
              pageSlice.map((s) => (
                <button
                  key={s.userId}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#134e4a]/25 hover:shadow-md"
                  onClick={() => setPreviewStaff(s)}
                >
                  <HrStaffAvatar staff={s} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{s.displayName || s.username}</p>
                    <p className="truncate text-xs text-slate-600">
                      {resolveBranchLabel(s, branchNames)} · {s.jobTitle || '—'}
                    </p>
                    <StaffBadges staff={s} />
                  </div>
                  <HrStatusBadge status={s.status} variant="staff" />
                </button>
              ))
            ) : (
              <>
                <AppTableWrap>
                  <AppTable role="numeric" className={compactTable ? 'text-xs' : undefined}>
                <AppTableThead>
                  {canBulkManage ? (
                    <AppTableTh>
                      <input
                        type="checkbox"
                        aria-label="Select page"
                        checked={pageSlice.length > 0 && pageSlice.every((s) => selectedIds.includes(s.userId))}
                        onChange={togglePageSelected}
                      />
                    </AppTableTh>
                  ) : null}
                  <SortableTh label="Name" sortId="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {visibleColumns.has('employeeNo') ? <AppTableTh>Staff ID</AppTableTh> : null}
                  {visibleColumns.has('branch') ? (
                    <SortableTh label="Branch" sortId="branch" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  ) : null}
                  {visibleColumns.has('department') ? (
                    <SortableTh label="Department" sortId="department" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  ) : null}
                  {visibleColumns.has('jobTitle') ? <AppTableTh>Job title</AppTableTh> : null}
                  {visibleColumns.has('manager') ? <AppTableTh>Manager</AppTableTh> : null}
                  {visibleColumns.has('profile') ? (
                    <SortableTh label="Profile" sortId="profile" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  ) : null}
                  {visibleColumns.has('docs') ? <AppTableTh>Documents</AppTableTh> : null}
                  {visibleColumns.has('group') ? <AppTableTh>Group</AppTableTh> : null}
                  {showSalary && visibleColumns.has('salary') ? (
                    <AppTableTh align="right">
                      <span className="inline-flex items-center gap-1">
                        <Lock size={12} aria-hidden />
                        Base salary
                      </span>
                    </AppTableTh>
                  ) : null}
                  {visibleColumns.has('joined') ? (
                    <SortableTh label="Joined" sortId="joined" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  ) : null}
                  {visibleColumns.has('status') ? <AppTableTh>Status</AppTableTh> : null}
                </AppTableThead>
                <AppTableBody>
                  {loading && !staff.length ? (
                    <HrTableLoadingRow colSpan={visibleColCount} message="Loading staff…" />
                  ) : null}
                  {!loading && total === 0 ? (
                    <HrTableEmptyRow colSpan={visibleColCount} message="No staff match these filters." />
                  ) : null}
                  {pageSlice.map((s) => {
                    const pct = profilePct(s);
                    const pctBadge = profilePctBadge(pct);
                    const contract = contractBadge(s);
                    const probation = probationBadge(s);
                    const doc = docExpiryBadge(s);
                    return (
                      <AppTableTr key={s.userId}>
                        {canBulkManage ? (
                          <AppTableTd>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(s.userId)}
                              onChange={() => toggleSelected(s.userId)}
                              aria-label={`Select ${s.displayName || s.username}`}
                            />
                          </AppTableTd>
                        ) : null}
                        <AppTableTd>
                          <div className="flex items-center gap-2">
                            <HrStaffAvatar staff={s} />
                            <button
                              type="button"
                              onClick={() => setPreviewStaff(s)}
                              className="font-semibold text-[#134e4a] hover:underline text-left"
                            >
                              {s.displayName || s.username}
                            </button>
                          </div>
                        </AppTableTd>
                        {visibleColumns.has('employeeNo') ? <AppTableTd>{s.employeeNo || '—'}</AppTableTd> : null}
                        {visibleColumns.has('branch') ? <AppTableTd>{resolveBranchLabel(s, branchNames)}</AppTableTd> : null}
                        {visibleColumns.has('department') ? <AppTableTd>{s.department || '—'}</AppTableTd> : null}
                        {visibleColumns.has('jobTitle') ? <AppTableTd>{s.jobTitle || '—'}</AppTableTd> : null}
                        {visibleColumns.has('manager') ? (
                          <AppTableTd>{s.lineManagerDisplayName || s.lineManagerUserId || '—'}</AppTableTd>
                        ) : null}
                        {visibleColumns.has('profile') ? (
                          <AppTableTd>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${pctBadge.cls}`}>
                              {pct}%
                            </span>
                          </AppTableTd>
                        ) : null}
                        {visibleColumns.has('docs') ? (
                          <AppTableTd>
                            {s.docExpirySummary?.nextExpiryIso ? (
                              <Link
                                to={`${staffBasePath}/${encodeURIComponent(s.userId)}?tab=documents`}
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${doc?.cls || 'border-red-200 bg-red-50 text-red-900'}`}
                              >
                                {s.docExpirySummary.nextExpiryIso}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </AppTableTd>
                        ) : null}
                        {visibleColumns.has('group') ? <AppTableTd>{payrollGroupLabel(s)}</AppTableTd> : null}
                        {showSalary && visibleColumns.has('salary') ? (
                          <AppTableTd align="right">
                            {s.compensationRedacted ? '—' : formatNgn(s.baseSalaryNgn)}
                          </AppTableTd>
                        ) : null}
                        {visibleColumns.has('joined') ? <AppTableTd>{s.dateJoinedIso || '—'}</AppTableTd> : null}
                        {visibleColumns.has('status') ? (
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
                            {doc ? (
                              <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${doc.cls}`}>
                                {doc.label}
                              </span>
                            ) : null}
                          </AppTableTd>
                        ) : null}
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
                {total > pageSize ? (
                  <AppTablePager
                    showingFrom={showingFrom}
                    showingTo={showingTo}
                    total={total}
                    hasPrev={page > 1}
                    hasNext={page < pageCount}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
                  />
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <HrStaffQuickPreviewSlideOver
        staff={previewStaff}
        staffBasePath={staffBasePath}
        branchNames={branchNames}
        isOpen={Boolean(previewStaff)}
        onClose={() => setPreviewStaff(null)}
      />
    </div>
  );
}
