import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrOrgChartTree } from '../../components/hr/HrOrgChartTree';
import { fetchHrOrgChart } from '../../lib/hrOrgChart';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

export default function HrOrgChart({ staffBasePath = '/hr/employees' } = {}) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const [chart, setChart] = useState({ roots: [], orphans: [], total: 0 });
  const [branchFilter, setBranchFilter] = useState('');

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
    if (!branchFilter) return chart;
    const match = (node) => String(node.branchId || '') === branchFilter;
    const filterTree = (nodes) =>
      nodes
        .map((n) => {
          const children = filterTree(n.children || []);
          if (match(n) || children.length) return { ...n, children };
          return null;
        })
        .filter(Boolean);
    return {
      ...chart,
      roots: filterTree(chart.roots || []),
      orphans: (chart.orphans || []).filter(match),
    };
  }, [chart, branchFilter]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Reporting lines from staff profiles (line manager). Click a person to open their HR file.
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
        <p className="text-xs text-slate-500 tabular-nums">{chart.total ?? 0} active staff in scope</p>
      </div>
      {loading && !chart.total ? <p className="text-sm text-slate-600">Loading org chart…</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6">
        <HrOrgChartTree chart={filteredChart} linkPrefix={staffBasePath} />
      </div>
    </div>
  );
}
