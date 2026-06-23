import React, { useMemo, useState } from 'react';
import { Award, Banknote, RefreshCw, Users } from 'lucide-react';
import { SalesListSearchInput, SalesListSortBar, SalesListTableFrame } from '../sales/SalesListTableFrame';

const SEGMENT_CHIP = {
  champion: 'border-teal-200 bg-teal-50 text-teal-900',
  core: 'border-slate-200 bg-slate-50 text-slate-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-950',
  risk: 'border-rose-200 bg-rose-50 text-rose-900',
  inactive: 'border-slate-200 bg-white text-slate-500',
};

const SORT_FIELDS = [
  { id: 'netCollectedNgn', label: 'Collected' },
  { id: 'debtNgn', label: 'Outstanding' },
  { id: 'customerName', label: 'Customer name' },
  { id: 'segment', label: 'Segment' },
];

function sortCustomers(rows, field, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (field === 'customerName' || field === 'segment') {
      return mul * String(a[field] || '').localeCompare(String(b[field] || ''));
    }
    return mul * ((Number(a[field]) || 0) - (Number(b[field]) || 0));
  });
}

export function ExecCustomersTab({
  data,
  busy,
  err,
  formatNgn,
  segmentFilter,
  onSegmentFilterChange,
  onReload,
  onSelectCustomer,
}) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('netCollectedNgn');
  const [sortDir, setSortDir] = useState('desc');

  const customers = data?.customers || [];
  const summary = data?.summary || {};
  const champion = data?.champion;

  const filtered = useMemo(() => {
    let rows = customers;
    if (segmentFilter && segmentFilter !== 'all') {
      rows = rows.filter((c) => c.segment === segmentFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        [c.customerName, c.customerId, c.segmentLabel, c.branchId].join(' ').toLowerCase().includes(q)
      );
    }
    return sortCustomers(rows, sortField, sortDir);
  }, [customers, segmentFilter, search, sortField, sortDir]);

  return (
    <div className="space-y-6 pb-10">
      {err ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-teal-700 flex items-center gap-1">
            <Award size={12} /> Champion
          </p>
          <p className="mt-1 text-sm font-bold text-[#134e4a] leading-tight line-clamp-2">
            {champion?.customerName ?? '—'}
          </p>
          <p className="mt-2 text-[10px] text-teal-800/90 border-t border-teal-100/80 pt-2">
            {champion?.netCollectedNgn != null ? formatNgn(champion.netCollectedNgn) : 'Top payer this period'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Users size={12} /> Core customers
          </p>
          <p className="mt-1 text-xl font-black text-[#134e4a] tabular-nums">{summary.core ?? 0}</p>
          <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">Reliable payers</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Banknote size={12} /> Champions
          </p>
          <p className="mt-1 text-xl font-black text-[#134e4a] tabular-nums">{summary.champion ?? 0}</p>
          <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-2">High value + clean pay</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1">
            At risk / watch
          </p>
          <p className="mt-1 text-xl font-black text-amber-950 tabular-nums">
            {(summary.watch ?? 0) + (summary.risk ?? 0)}
          </p>
          <p className="mt-2 text-[10px] text-amber-900/80 border-t border-amber-100 pt-2">
            {summary.risk ?? 0} at risk · {summary.watch ?? 0} watch
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'champion', label: 'Champions' },
          { id: 'core', label: 'Core' },
          { id: 'watch', label: 'Watch' },
          { id: 'risk', label: 'At risk' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSegmentFilterChange(f.id)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ring-1 ${
              segmentFilter === f.id
                ? 'bg-[#134e4a] text-white ring-[#134e4a]'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onReload}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="h-1 bg-[#134e4a]" aria-hidden />
        <SalesListTableFrame
          toolbar={
            <div className="flex flex-col gap-3">
              <SalesListSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search customers…"
              />
              <SalesListSortBar
                fields={SORT_FIELDS}
                field={sortField}
                dir={sortDir}
                onFieldChange={setSortField}
                onDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[880px]">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase text-slate-500">
                  <th className="py-2 text-left">Segment</th>
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-right">Collected</th>
                  <th className="py-2 text-right">Outstanding</th>
                  <th className="py-2 text-left">Aging</th>
                  <th className="py-2 text-right">Receipts</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !busy ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No customers match this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.customerId} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${SEGMENT_CHIP[c.segment] || SEGMENT_CHIP.inactive}`}
                        >
                          {c.segmentLabel}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold text-slate-900">{c.customerName}</td>
                      <td className="py-2.5 text-right tabular-nums font-bold text-[#134e4a]">
                        {formatNgn(c.netCollectedNgn ?? 0)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {c.debtNgn > 0 ? formatNgn(c.debtNgn) : '—'}
                      </td>
                      <td className="py-2.5">{c.primaryAgingBand || '—'}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.receiptCount ?? 0}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer?.(c)}
                          className="rounded-lg border border-[#134e4a]/30 bg-[#134e4a]/5 px-3 py-1.5 text-[10px] font-black uppercase text-[#134e4a] hover:bg-[#134e4a]/10"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SalesListTableFrame>
      </section>
    </div>
  );
}
