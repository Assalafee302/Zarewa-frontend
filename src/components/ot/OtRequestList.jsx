import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { OtStatusChip } from './OtStatusTimeline';
import { OT_STATUS } from '../../lib/otConstants';

/**
 * Ops list of OT requests.
 * @param {{ rows: object[]; loading?: boolean; selectedId?: string; onSelect: (id: string) => void; filter: string; onFilterChange: (f: string) => void }} props
 */
export function OtRequestList({
  rows = [],
  loading = false,
  selectedId = '',
  onSelect,
  filter = 'mine',
  onFilterChange,
  title = 'My OT requests',
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <h3 className="text-sm font-black text-zarewa-teal">{title}</h3>
        <div className="ml-auto flex flex-wrap gap-1">
          {[
            { id: 'mine', label: 'Mine' },
            { id: 'draft', label: 'Drafts' },
            { id: 'pending', label: 'Pending' },
            { id: 'all', label: 'Branch' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange?.(f.id)}
              className={`rounded-md px-2 py-1 text-ui-xs font-bold uppercase ${
                filter === f.id
                  ? 'bg-zarewa-teal text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="px-3 py-8 text-center text-xs text-slate-500">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs text-slate-500">No OT pay requests yet.</p>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-auto divide-y divide-slate-100">
        {rows.map((row) => {
          const active = row.id === selectedId;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect?.(row.id)}
                className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-teal-50/60 ${
                  active ? 'bg-teal-50/80' : ''
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-800">{row.id}</span>
                  <OtStatusChip status={row.status} />
                </div>
                <p className="text-ui-xs text-slate-600">
                  {row.dayIso} · {row.workType}
                  {row.quotationRef ? ` · ${row.quotationRef}` : ''}
                  {row.poId ? ` · ${row.poId}` : ''}
                </p>
                <p className="text-ui-xs font-semibold tabular-nums text-slate-500">
                  {row.status === OT_STATUS.APPROVED || row.status === OT_STATUS.PAID
                    ? formatNgn(row.totalPayableNgn)
                    : row.reason
                      ? String(row.reason).slice(0, 60)
                      : '—'}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
