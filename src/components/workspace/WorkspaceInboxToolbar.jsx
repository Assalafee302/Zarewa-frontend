import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { DEFAULT_INBOX_FILTERS } from '../../lib/workspaceInboxFilters.js';
import {
  WORKSPACE_CATEGORY_LABELS,
  WORKSPACE_CATEGORY_ORDER,
} from '../../lib/workspaceCategoryRegistry.js';

function countActiveFilters(f, category) {
  let n = 0;
  if (category && category !== 'all') n += 1;
  if (f.status) n += 1;
  if (f.priority) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  if (f.assignedToMe) n += 1;
  if (f.overdueOnly || f.unreadOnly || f.createdByMe) n += 1;
  return n;
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-900 ring-1 ring-teal-100">
      {label}
      <button type="button" onClick={onRemove} className="rounded p-0.5 hover:bg-teal-100" aria-label={`Remove ${label}`}>
        <X size={10} />
      </button>
    </span>
  );
}

/**
 * Workspace inbox toolbar — search, area, and optional filters in a compact layout.
 */
export function WorkspaceInboxToolbar({
  filters,
  onFiltersChange,
  onRefresh,
  refreshing = false,
  lastUpdatedLabel = '',
  degraded = false,
  showFilterPanel = true,
  category = 'all',
  onCategoryChange,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const f = { ...DEFAULT_INBOX_FILTERS, ...filters };
  const activeCount = countActiveFilters(f, category);

  const chips = useMemo(() => {
    const list = [];
    if (category && category !== 'all') {
      list.push({
        key: 'category',
        label: WORKSPACE_CATEGORY_LABELS[category] || category,
      });
    }
    if (f.status) list.push({ key: 'status', label: `Status: ${f.status}` });
    if (f.priority) list.push({ key: 'priority', label: `Priority: ${f.priority}` });
    if (f.dateFrom || f.dateTo) {
      list.push({
        key: 'dateRange',
        label: f.dateFrom && f.dateTo ? `${f.dateFrom} – ${f.dateTo}` : f.dateFrom ? `From ${f.dateFrom}` : `To ${f.dateTo}`,
      });
    }
    if (f.assignedToMe) list.push({ key: 'assignedToMe', label: 'Assigned to me' });
    if (f.overdueOnly) list.push({ key: 'overdueOnly', label: 'Overdue' });
    if (f.unreadOnly) list.push({ key: 'unreadOnly', label: 'Unread' });
    if (f.createdByMe) list.push({ key: 'createdByMe', label: 'Created by me' });
    return list;
  }, [f, category]);

  const toggleBool = (key) => onFiltersChange?.({ ...f, [key]: !f[key] });

  const removeChip = (key) => {
    if (key === 'category') {
      onCategoryChange?.('all');
      return;
    }
    if (key === 'dateRange') {
      onFiltersChange?.({ ...f, dateFrom: '', dateTo: '' });
      return;
    }
    if (key === 'status' || key === 'priority') {
      onFiltersChange?.({ ...f, [key]: '' });
    } else {
      onFiltersChange?.({ ...f, [key]: false });
    }
  };

  const clearAllFilters = () => {
    onCategoryChange?.('all');
    onFiltersChange?.({ ...DEFAULT_INBOX_FILTERS, query: f.query });
    setFiltersOpen(false);
  };

  const selectCls =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/25';

  const toggleCls = (active) =>
    `rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 transition-colors ${
      active ? 'bg-teal-50 text-teal-900 ring-teal-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-[12rem]">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={f.query}
            onChange={(e) => onFiltersChange?.({ ...f, query: e.target.value })}
            placeholder="Search this folder…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
            aria-label="Search work items in current folder"
          />
        </div>

        {onCategoryChange ? (
          <label className="sr-only" htmlFor="workspace-inbox-area">
            Area
          </label>
        ) : null}
        {onCategoryChange ? (
          <select
            id="workspace-inbox-area"
            className={`${selectCls} w-auto min-w-[8.5rem] max-w-[11rem] shrink-0`}
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by area"
          >
            {WORKSPACE_CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {WORKSPACE_CATEGORY_LABELS[key] || key}
              </option>
            ))}
          </select>
        ) : null}

        {showFilterPanel ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
              filtersOpen || activeCount > 0
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 ? (
              <span className="rounded-full bg-teal-800 px-1.5 py-px text-[9px] font-bold text-white">{activeCount}</span>
            ) : null}
          </button>
        ) : null}

        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-white disabled:opacity-50"
          aria-label="Refresh workspace list"
          title="Refresh"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => removeChip(c.key)} />
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {(lastUpdatedLabel || degraded) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          {lastUpdatedLabel ? <span>Last refreshed {lastUpdatedLabel}</span> : null}
          {degraded ? (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-100">
              Cached snapshot — reconnect for live data
            </span>
          ) : null}
        </div>
      )}

      {filtersOpen && showFilterPanel ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</label>
              <select
                className={selectCls}
                value={f.status}
                onChange={(e) => onFiltersChange?.({ ...f, status: e.target.value })}
                aria-label="Status"
              >
                <option value="">Any status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</label>
              <select
                className={selectCls}
                value={f.priority}
                onChange={(e) => onFiltersChange?.({ ...f, priority: e.target.value })}
                aria-label="Priority"
              >
                <option value="">Any priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">Important</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</label>
              <input
                type="date"
                className={selectCls}
                value={f.dateFrom}
                onChange={(e) => onFiltersChange?.({ ...f, dateFrom: e.target.value })}
                aria-label="From date"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</label>
              <input
                type="date"
                className={selectCls}
                value={f.dateTo}
                onChange={(e) => onFiltersChange?.({ ...f, dateTo: e.target.value })}
                aria-label="To date"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['assignedToMe', 'Assigned to me'],
              ['overdueOnly', 'Overdue'],
              ['unreadOnly', 'Unread'],
              ['createdByMe', 'Created by me'],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => toggleBool(key)} className={toggleCls(f[key])}>
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
