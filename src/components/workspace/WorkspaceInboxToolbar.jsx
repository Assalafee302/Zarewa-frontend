import React, { useState } from 'react';
import { Filter, RefreshCw, Search, X } from 'lucide-react';
import { DEFAULT_INBOX_FILTERS } from '../../lib/workspaceInboxFilters.js';

/**
 * @param {object} props
 */
export function WorkspaceInboxToolbar({
  filters,
  onFiltersChange,
  onRefresh,
  refreshing = false,
  lastUpdatedLabel = '',
  degraded = false,
  showFilterPanel = true,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const f = { ...DEFAULT_INBOX_FILTERS, ...filters };

  const toggleBool = (key) => {
    onFiltersChange?.({ ...f, [key]: !f[key] });
  };

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-2 py-2.5 sm:px-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={f.query}
            onChange={(e) => onFiltersChange?.({ ...f, query: e.target.value })}
            placeholder="Search work items…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            aria-label="Search work items"
          />
        </div>
        {showFilterPanel ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold ${
              filtersOpen ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
        ) : null}
        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Refresh workspace"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {(lastUpdatedLabel || degraded) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          {lastUpdatedLabel ? <span>Updated {lastUpdatedLabel}</span> : null}
          {degraded ? (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">
              Cached snapshot — reconnect for live data
            </span>
          ) : null}
        </div>
      )}

      {filtersOpen && showFilterPanel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
          <select
            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            value={f.status}
            onChange={(e) => onFiltersChange?.({ ...f, status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="converted">Converted</option>
          </select>
          <select
            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            value={f.priority}
            onChange={(e) => onFiltersChange?.({ ...f, priority: e.target.value })}
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
          <input
            type="date"
            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            value={f.dateFrom}
            onChange={(e) => onFiltersChange?.({ ...f, dateFrom: e.target.value })}
            aria-label="From date"
          />
          <input
            type="date"
            className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            value={f.dateTo}
            onChange={(e) => onFiltersChange?.({ ...f, dateTo: e.target.value })}
            aria-label="To date"
          />
          {[
            ['assignedToMe', 'Assigned to me'],
            ['createdByMe', 'Created by me'],
            ['requiresApproval', 'Requires approval'],
            ['requiresResponse', 'Requires response'],
            ['overdueOnly', 'Overdue'],
            ['unreadOnly', 'Unread'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleBool(key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                f[key]
                  ? 'bg-teal-100 text-teal-950 ring-1 ring-teal-200'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onFiltersChange?.({ ...DEFAULT_INBOX_FILTERS, query: f.query })}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <X size={12} />
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
