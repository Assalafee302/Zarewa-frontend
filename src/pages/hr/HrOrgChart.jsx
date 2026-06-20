import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Link2, Minus, Plus, Printer, Search } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrOrgChartTree } from '../../components/hr/HrOrgChartTree';
import { HrOrgRelationshipModal } from '../../components/hr/HrOrgRelationshipModal';
import { HrOrgDataQualityPanel } from '../../components/hr/HrOrgDataQualityPanel';
import { applyOrgLineManager, fetchHrOrgChart } from '../../lib/hrOrgChart';
import { orgChartExportCsvUrl } from '../../lib/hrStaffDirectoryApi';
import { HR_FIELD_CLASS, HR_BTN_SECONDARY } from '../../components/hr/hrFormStyles';
import { HR_EMPLOYEES, hrTabPath } from '../../lib/hrRoutes';
import { TEAM_HR_BASE } from '../../lib/teamHrRoutes';
import { canManageHrStaff } from '../../lib/hrAccess';
import {
  ORG_CHART_VIEWS,
  branchLabel,
  exportFilteredChartCsv,
  findOrgChartFocusPath,
  orgUnitLabel,
  roleFamilyLabel,
  summarizeHrOrgChart,
} from '../../lib/hrOrgChartUi';

const COLLAPSE_KEY = 'zarewa-hr-org-chart-collapse';
const VIEW_KEY = 'zarewa-hr-org-chart-view';
const ZOOM_KEY = 'zarewa-hr-org-chart-zoom';

function loadCollapsePref() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadViewPref() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return ORG_CHART_VIEWS.some((x) => x.id === v) ? v : 'hierarchy';
  } catch {
    return 'hierarchy';
  }
}

function loadZoomPref() {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    return Number.isFinite(z) && z >= 0.6 && z <= 1.4 ? z : 1;
  } catch {
    return 1;
  }
}

function nodeMatchesSearch(node, q) {
  if (!q) return true;
  const hay = [node.displayName, node.jobTitle, node.department, node.userId, node.branchId, node.orgNode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (hay.includes(q)) return true;
  return (node.children || []).some((c) => nodeMatchesSearch(c, q));
}

function filterChartTree(nodes, q) {
  if (!q) return nodes;
  return nodes
    .map((n) => {
      const children = filterChartTree(n.children || [], q);
      if (nodeMatchesSearch(n, q) || children.length) return { ...n, children };
      return null;
    })
    .filter(Boolean);
}

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg font-black tabular-nums text-[#134e4a]">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function HrOrgChart({ staffBasePath = HR_EMPLOYEES, teamMode = false } = {}) {
  const [searchParams] = useSearchParams();
  const focusUserId = String(searchParams.get('focus') || '').trim();
  const orphansPanelRef = useRef(null);
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const perms = ws?.permissions || [];
  const canEditRelationships = canManageHrStaff(perms);
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const [chart, setChart] = useState({ roots: [], orphans: [], total: 0, summary: null, dataQuality: null });
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [collapseAll, setCollapseAll] = useState(loadCollapsePref);
  const [view, setView] = useState(loadViewPref);
  const [zoom, setZoom] = useState(loadZoomPref);
  const [editMode, setEditMode] = useState(false);
  const [linkSource, setLinkSource] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [relModalType, setRelModalType] = useState('reports_to');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapseAll ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapseAll]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      /* ignore */
    }
  }, [zoom]);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrOrgChart();
    if (!ok || !data?.ok) {
      setChart({ roots: [], orphans: [], total: 0, summary: null, dataQuality: null });
      return { error: data?.error || 'Could not load org chart.', hasData: false };
    }
    setChart(data.chart || { roots: [], orphans: [], total: 0, summary: null, dataQuality: null });
    return { hasData: true };
  }, []);

  const clearLinkState = useCallback(() => {
    setLinkSource(null);
    setLinkTarget(null);
    setRelModalOpen(false);
    setSaveError('');
  }, []);

  const handleNodeClick = useCallback(
    (node) => {
      if (!editMode || saveBusy) return;
      if (!linkSource) {
        setLinkSource(node);
        return;
      }
      if (linkSource.userId === node.userId) {
        setLinkSource(null);
        return;
      }
      setLinkTarget(node);
      setRelModalType('reports_to');
      setRelModalOpen(true);
      setSaveError('');
    },
    [editMode, saveBusy, linkSource]
  );

  const openRemoveManager = () => {
    setLinkTarget(null);
    setRelModalType('remove');
    setRelModalOpen(true);
    setSaveError('');
  };

  const handleConfirmRelationship = async (type) => {
    if (!linkSource?.userId) return;
    setSaveBusy(true);
    setSaveError('');
    const managerId = type === 'remove' ? null : linkTarget?.userId || null;
    if (type === 'reports_to' && !managerId) {
      setSaveBusy(false);
      setSaveError('Select a manager to link.');
      return;
    }
    const { ok, data } = await applyOrgLineManager(linkSource.userId, managerId);
    setSaveBusy(false);
    if (!ok || !data?.ok) {
      setSaveError(data?.error || 'Could not save relationship.');
      return;
    }
    toast(type === 'remove' ? 'Line manager removed.' : 'Reporting line saved.');
    clearLinkState();
    await reload();
  };

  const toggleEditMode = () => {
    setEditMode((v) => {
      if (v) clearLinkState();
      return !v;
    });
  };

  const filteredChart = useMemo(() => {
    let working = chart;
    if (branchFilter) {
      const match = (node) => String(node.branchId || '') === branchFilter;
      const filterTree = (nodes) =>
        nodes
          .map((n) => {
            const children = filterTree(n.children || []);
            if (match(n) || children.length) return { ...n, children };
            return null;
          })
          .filter(Boolean);
      working = {
        ...working,
        roots: filterTree(working.roots || []),
        orphans: (working.orphans || []).filter(match),
      };
    }
    if (departmentFilter) {
      const match = (node) => String(node.department || '') === departmentFilter;
      const filterTree = (nodes) =>
        nodes
          .map((n) => {
            const children = filterTree(n.children || []);
            if (match(n) || children.length) return { ...n, children };
            return null;
          })
          .filter(Boolean);
      working = {
        ...working,
        roots: filterTree(working.roots || []),
        orphans: (working.orphans || []).filter(match),
      };
    }
    const q = search.trim().toLowerCase();
    if (q) {
      working = {
        ...working,
        roots: filterChartTree(working.roots || [], q),
        orphans: (working.orphans || []).filter((o) => nodeMatchesSearch(o, q)),
      };
    }
    return working;
  }, [chart, branchFilter, departmentFilter, search]);

  const isFiltered = Boolean(branchFilter || departmentFilter || search.trim());
  const displaySummary = useMemo(() => summarizeHrOrgChart(filteredChart), [filteredChart]);
  const focusPath = useMemo(() => new Set(findOrgChartFocusPath(filteredChart, focusUserId)), [filteredChart, focusUserId]);
  const cycleUserIds = useMemo(() => {
    const ids = new Set();
    for (const cycle of chart.dataQuality?.cycles || []) {
      for (const m of cycle.members || []) ids.add(m.userId);
    }
    return ids;
  }, [chart.dataQuality?.cycles]);

  const directoryFixPath = teamMode
    ? `${TEAM_HR_BASE}/staff?quick=no-manager`
    : hrTabPath(HR_EMPLOYEES, 'directory', { quick: 'no-manager' });

  const scrollToOrphans = useCallback(() => {
    orphansPanelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportFiltered = () => {
    exportFilteredChartCsv(filteredChart, branches);
  };

  const summary = displaySummary;
  const summaryScopeLabel = isFiltered ? 'Filtered view' : 'All staff in scope';
  const activeView = ORG_CHART_VIEWS.find((v) => v.id === view) || ORG_CHART_VIEWS[0];
  const topDepartments = (summary?.departments || []).slice(0, 3).map((d) => d.key).join(' · ');
  const topBranches = (summary?.branches || [])
    .slice(0, 3)
    .map((b) => branchLabel(b.key, branches))
    .join(' · ');

  return (
    <div className="hr-org-chart-root space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
        <p className="text-sm text-slate-700">
          Company organogram built from line-manager reporting lines. Switch lenses to see departments, branches, or payroll
          units. Click any person to open their HR file.
        </p>
        <HrOrgDataQualityPanel
          dataQuality={chart.dataQuality}
          directoryFixPath={directoryFixPath}
          staffBasePath={staffBasePath}
          onScrollToOrphans={(chart.orphans || []).length ? scrollToOrphans : undefined}
        />
        {summary ? (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{summaryScopeLabel}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              <StatTile label="Active staff" value={summary.total} />
              <StatTile label="Top level" value={summary.roots} hint="No manager in scope" />
              <StatTile label="Leadership" value={summary.leadership} hint="Heads & directors" />
              <StatTile label="Depth" value={summary.maxDepth + 1} hint="Reporting tiers" />
              <StatTile label="Departments" value={summary.departments.length} hint={topDepartments || '—'} />
              <StatTile label="Branches" value={summary.branches.length} hint={topBranches || '—'} />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Organogram view">
        {ORG_CHART_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            title={v.hint}
            onClick={() => setView(v.id)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              view === v.id
                ? 'bg-[#134e4a] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-[#134e4a]/30'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{activeView.hint}</p>

      {editMode ? (
        <div className="rounded-xl border border-[#134e4a]/25 bg-teal-50/70 px-4 py-3">
          {linkSource ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-800">
                <span className="font-bold text-[#134e4a]">{linkSource.displayName || linkSource.userId}</span>
                <span className="text-slate-600"> selected — click another person to set as line manager, or:</span>
              </p>
              <button type="button" className={HR_BTN_SECONDARY} onClick={openRemoveManager}>
                Remove manager
              </button>
              <button type="button" className="text-xs font-bold uppercase text-slate-500 hover:underline" onClick={() => setLinkSource(null)}>
                Cancel selection
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-700">
              <span className="font-bold text-[#134e4a]">Link mode.</span> Click a team member, then click their line manager.
              Cards are highlighted when selectable.
            </p>
          )}
        </div>
      ) : null}

      <div className="hr-org-chart-toolbar flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Branch
          <select
            className={`${HR_FIELD_CLASS} ml-2 min-w-[160px]`}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Department
          <select
            className={`${HR_FIELD_CLASS} ml-2 min-w-[160px]`}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {(chart.summary?.departments || []).map((d) => (
              <option key={d.key} value={d.key}>
                {d.key} ({d.count})
              </option>
            ))}
          </select>
        </label>
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, role, department…"
            className={`${HR_FIELD_CLASS} pl-8`}
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
            onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[3rem] text-center text-[10px] font-bold tabular-nums text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
            onClick={() => setZoom((z) => Math.min(1.4, Math.round((z + 0.1) * 10) / 10))}
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCollapseAll((v) => !v)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
        >
          {collapseAll ? 'Expand all' : 'Collapse all'}
        </button>
        {canEditRelationships && !teamMode ? (
          <button
            type="button"
            onClick={toggleEditMode}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
              editMode
                ? 'border-[#134e4a] bg-[#134e4a] text-white shadow-sm'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Link2 size={14} aria-hidden />
            {editMode ? 'Done editing' : 'Edit relationships'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleExportFiltered}
          disabled={!displaySummary?.total}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download size={14} aria-hidden />
          Export view
        </button>
        <a
          href={orgChartExportCsvUrl()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
        >
          <Download size={14} aria-hidden />
          Export all
        </a>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
        >
          <Printer size={14} aria-hidden />
          Print
        </button>
      </div>

      {chart.summary && view === 'unit' ? (
        <div className="flex flex-wrap gap-2">
          {(chart.summary.orgUnits || []).map((u) => (
            <span
              key={u.key}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600"
            >
              {orgUnitLabel(u.key)} · {u.count}
            </span>
          ))}
        </div>
      ) : null}

      {chart.summary && view === 'department' ? (
        <div className="flex flex-wrap gap-2">
          {(chart.summary.roleFamilies || []).slice(0, 8).map((f) => (
            <span
              key={f.key}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600"
            >
              {roleFamilyLabel(f.key)} · {f.count}
            </span>
          ))}
        </div>
      ) : null}

      {loading && !chart.total ? <p className="text-sm text-slate-600">Loading organogram…</p> : null}

      <div className="hr-org-chart-canvas overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-6">
        <div
          className="inline-block min-w-full origin-top transition-transform"
          style={{ transform: `scale(${zoom})`, width: zoom < 1 ? `${100 / zoom}%` : '100%' }}
        >
          <HrOrgChartTree
            chart={filteredChart}
            linkPrefix={staffBasePath}
            collapseAll={collapseAll}
            view={view}
            branches={branches}
            editMode={editMode}
            linkSourceId={linkSource?.userId || ''}
            focusUserId={focusUserId}
            focusPath={focusPath}
            cycleUserIds={cycleUserIds}
            orphansPanelRef={orphansPanelRef}
            onNodeClick={handleNodeClick}
          />
        </div>
      </div>

      <HrOrgRelationshipModal
        open={relModalOpen}
        source={linkSource}
        target={linkTarget}
        initialType={relModalType}
        busy={saveBusy}
        error={saveError}
        onClose={() => {
          setRelModalOpen(false);
          setSaveError('');
        }}
        onConfirm={handleConfirmRelationship}
      />

      {(filteredChart.orphans || []).length ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {filteredChart.orphans.length} staff without a complete reporting line in this view —{' '}
          <Link to={directoryFixPath} className="font-semibold underline">
            fix in the directory
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
