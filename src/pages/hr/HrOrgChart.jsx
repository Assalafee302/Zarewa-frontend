import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrOrgChartTree } from '../../components/hr/HrOrgChartTree';
import { fetchHrOrgChart } from '../../lib/hrOrgChart';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';

function nodeMatchesSearch(node, q) {
  if (!q) return true;
  const hay = [node.displayName, node.jobTitle, node.department, node.userId].join(' ').toLowerCase();
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

export default function HrOrgChart({ staffBasePath = HR_EMPLOYEES } = {}) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const [chart, setChart] = useState({ roots: [], orphans: [], total: 0 });
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [collapseAll, setCollapseAll] = useState(false);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrOrgChart();
    if (!ok || !data?.ok) {
      setChart({ roots: [], orphans: [], total: 0 });
      return { error: data?.error || 'Could not load org chart.', hasData: false };
    }
    setChart(data.chart || { roots: [], orphans: [], total: 0 });
    return { hasData: true };
  }, []);

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
    const q = search.trim().toLowerCase();
    if (q) {
      working = {
        ...working,
        roots: filterChartTree(working.roots || [], q),
        orphans: (working.orphans || []).filter((o) => nodeMatchesSearch(o, q)),
      };
    }
    return working;
  }, [chart, branchFilter, search]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Reporting lines from staff profiles (line manager). Click a person to open their HR file. Orphans have no manager in scope.
      </p>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs font-semibold text-slate-600">
          Filter by branch
          <select
            className={`${HR_FIELD_CLASS} ml-2 min-w-[180px]`}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All branches in scope</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
            placeholder="Search org chart…"
            className={`${HR_FIELD_CLASS} pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={() => setCollapseAll((v) => !v)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
        >
          {collapseAll ? 'Expand all' : 'Collapse all'}
        </button>
        <p className="text-xs text-slate-500 tabular-nums">{chart.total ?? 0} active staff in scope</p>
      </div>
      {loading && !chart.total ? <p className="text-sm text-slate-600">Loading org chart…</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6">
        <HrOrgChartTree chart={filteredChart} linkPrefix={staffBasePath} collapseAll={collapseAll} />
      </div>
      {(filteredChart.orphans || []).length ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {filteredChart.orphans.length} staff without a line manager in scope — assign managers in the employee directory.
        </p>
      ) : null}
    </div>
  );
}
