import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { DEFAULT_INBOX_FILTERS } from '../../lib/workspaceInboxFilters.js';

function countActiveFilters(f) {
  let n = 0;
  if (f.status) n += 1;
  if (f.priority) n += 1;
  if (f.dateFrom || f.dateTo) n += 1;
  if (f.assignedToMe) n += 1;
  if (f.requiresApproval || f.requiresResponse) n += 1;
  if (f.overdueOnly || f.unreadOnly || f.createdByMe) n += 1;
  if (f.branchId || f.officeKey || f.category) n += 1;
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
 * Clean workspace inbox toolbar — primary filters visible, secondary under “More filters”.
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
  const [moreOpen, setMoreOpen] = useState(false);
  const f = { ...DEFAULT_INBOX_FILTERS, ...filters };
  const activeCount = countActiveFilters(f);

  const chips = useMemo(() => {
    const list = [];
    if (f.status) list.push({ key: 'status', label: `Status: ${f.status}` });
    if (f.priority) list.push({ key: 'priority', label: `Priority: ${f.priority}` });
    if (f.dateFrom) list.push({ key: 'dateFrom', label: `From ${f.dateFrom}` });
    if (f.dateTo) list.push({ key: 'dateTo', label: `To ${f.dateTo}` });
    if (f.assignedToMe) list.push({ key: 'assignedToMe', label: 'Assigned to me' });
    if (f.requiresApproval) list.push({ key: 'requiresApproval', label: 'Requires approval' });
    if (f.requiresResponse) list.push({ key: 'requiresResponse', label: 'Requires response' });
    if (f.overdueOnly) list.push({ key: 'overdueOnly', label: 'Overdue' });
    if (f.unreadOnly) list.push({ key: 'unreadOnly', label: 'Unread' });
    if (f.createdByMe) list.push({ key: 'createdByMe', label: 'Created by me' });
    return list;
  }, [f]);

  const toggleBool = (key) => onFiltersChange?.({ ...f, [key]: !f[key] });

  const removeChip = (key) => {
    if (key === 'status' || key === 'priority' || key === 'dateFrom' || key === 'dateTo') {
      onFiltersChange?.({ ...f, [key]: '' });
    } else {
      onFiltersChange?.({ ...f, [key]: false });
    }
  };

  const selectCls =
    'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/25';

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={f.query}
            onChange={(e) => onFiltersChange?.({ ...f, query: e.target.value })}
            placeholder="Search in this folder…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
            aria-label="Search work items in current folder"
          />
        </div>
        {showFilterPanel ? (
          <>
            <select className={selectCls} value={f.status} onChange={(e) => onFiltersChange?.({ ...f, status: e.target.value })} aria-label="Status">
              <option value="">Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <select className={selectCls} value={f.priority} onChange={(e) => onFiltersChange?.({ ...f, priority: e.target.value })} aria-label="Priority">
              <option value="">Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">Important</option>
              <option value="normal">Normal</option>
            </select>
            <input type="date" className={selectCls} value={f.dateFrom} onChange={(e) => onFiltersChange?.({ ...f, dateFrom: e.target.value })} aria-label="From date" />
            <button
              type="button"
              onClick={() => toggleBool('assignedToMe')}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ${
                f.assignedToMe ? 'bg-teal-50 text-teal-900 ring-teal-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Assigned to me
            </button>
            <button
              type="button"
              onClick={() => {
                const active = f.requiresApproval || f.requiresResponse;
                onFiltersChange?.({
                  ...f,
                  requiresApproval: !active,
                  requiresResponse: !active,
                });
              }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ${
                f.requiresApproval || f.requiresResponse
                  ? 'bg-amber-50 text-amber-900 ring-amber-200'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Requires action
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                moreOpen || activeCount > 0
                  ? 'border-teal-200 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={13} />
              More filters
              {activeCount > 0 ? <span className="rounded-full bg-teal-800 px-1.5 text-[9px] text-white">{activeCount}</span> : null}
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
          aria-label="Refresh workspace list"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => removeChip(c.key)} />
          ))}
          <button
            type="button"
            onClick={() => onFiltersChange?.({ ...DEFAULT_INBOX_FILTERS, query: f.query })}
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

      {moreOpen && showFilterPanel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input type="date" className={selectCls} value={f.dateTo} onChange={(e) => onFiltersChange?.({ ...f, dateTo: e.target.value })} aria-label="To date" />
          {[
            ['overdueOnly', 'Overdue'],
            ['unreadOnly', 'Unread'],
            ['createdByMe', 'Created by me'],
            ['requiresResponse', 'Requires response'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleBool(key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                f[key] ? 'bg-teal-100 text-teal-950 ring-1 ring-teal-200' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
