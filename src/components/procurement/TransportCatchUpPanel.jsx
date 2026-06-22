import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Truck } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { SalesListSearchInput } from '../sales/SalesListTableFrame';

function gapLabel(gapKind) {
  if (gapKind === 'fee') return 'Fee missing';
  if (gapKind === 'agent') return 'Haulier missing';
  if (gapKind === 'awaiting_treasury') return 'Awaiting Finance payout';
  return 'No haulier or fee';
}

function gapTone(gapKind) {
  if (gapKind === 'awaiting_treasury') return 'border-sky-200 bg-sky-50 text-sky-950';
  return 'border-amber-200 bg-amber-50 text-amber-950';
}

/**
 * PO transport catch-up table and orphan haulage reconciliation hints.
 */
export function TransportCatchUpPanel({
  catchUpRows = [],
  orphanRows = [],
  branchNameById = {},
  canManagePo = false,
  canFinancePay = false,
  onLinkTransport,
  onOpenPo,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredCatchUp = useMemo(() => {
    let rows = catchUpRows;
    if (filter === 'link') rows = rows.filter((r) => r.action === 'link_transport');
    if (filter === 'pay') rows = rows.filter((r) => r.action === 'post_treasury');
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const blob = [
        row.poID,
        row.supplierName,
        row.status,
        row.transportAgentName,
        row.transportReference,
        row.gapKind,
        row.branchId,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [catchUpRows, filter, search]);

  const linkCount = catchUpRows.filter((r) => r.action === 'link_transport').length;
  const payCount = catchUpRows.filter((r) => r.action === 'post_treasury').length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#134e4a] flex items-center gap-2">
                <Truck className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                PO transport catch-up
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed max-w-2xl">
                Work through open and received POs where haulage is missing or unpaid. Assign transport in
                Procurement, then Finance posts treasury payout so balances stay correct.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-full px-3 py-1.5 border ${filter === 'all' ? 'border-[#134e4a] bg-[#134e4a] text-white' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                All ({catchUpRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('link')}
                className={`rounded-full px-3 py-1.5 border ${filter === 'link' ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
              >
                Assign ({linkCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pay')}
                className={`rounded-full px-3 py-1.5 border ${filter === 'pay' ? 'border-sky-800 bg-sky-800 text-white' : 'border-sky-200 bg-sky-50 text-sky-900'}`}
              >
                Pay ({payCount})
              </button>
            </div>
          </div>
          <div className="mt-3 max-w-md">
            <SalesListSearchInput value={search} onChange={setSearch} placeholder="Search PO, supplier, agent…" />
          </div>
        </div>

        {filteredCatchUp.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12 px-4">
            {catchUpRows.length === 0
              ? 'No PO transport catch-up items in this workspace scope.'
              : 'No rows match your filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">PO</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Gap</th>
                  <th className="px-4 py-2.5">Transport</th>
                  <th className="px-4 py-2.5 text-right">Outstanding</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatchUp.map((row) => (
                  <tr key={row.poID} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono font-bold text-[#134e4a]">
                      <button
                        type="button"
                        onClick={() => onOpenPo?.(row.poID)}
                        className="hover:underline text-left"
                      >
                        {row.poID}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{row.supplierName || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.status || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase ${gapTone(row.gapKind)}`}
                      >
                        {gapLabel(row.gapKind)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {row.transportAgentName || '—'}
                      {row.transportAmountNgn > 0 ? (
                        <span className="block text-[10px] text-slate-500 tabular-nums">
                          Fee {formatNgn(row.transportAmountNgn)}
                          {row.transportPaidNgn > 0 ? ` · Paid ${formatNgn(row.transportPaidNgn)}` : ''}
                        </span>
                      ) : null}
                      {row.branchId ? (
                        <span className="block text-[9px] text-slate-400">
                          {branchNameById[row.branchId] || row.branchId}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-800">
                      {row.outstandingNgn > 0 ? formatNgn(row.outstandingNgn) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.action === 'link_transport' && canManagePo ? (
                        <button
                          type="button"
                          onClick={() => onLinkTransport?.(row.poID)}
                          className="text-[10px] font-bold uppercase text-violet-900 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-100"
                        >
                          Assign transport
                        </button>
                      ) : row.action === 'post_treasury' && canFinancePay ? (
                        <Link
                          to="/accounts"
                          state={{ accountsTab: 'desk' }}
                          className="inline-block text-[10px] font-bold uppercase text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 hover:bg-sky-100"
                        >
                          Finance desk
                        </Link>
                      ) : (
                        <span className="text-[9px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {orphanRows.length > 0 ? (
        <section className="rounded-2xl border border-rose-200/80 bg-rose-50/40 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-rose-100/80">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-950 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
              Orphan haulage payments
            </p>
            <p className="text-[11px] text-rose-950/80 mt-1 leading-relaxed max-w-2xl">
              Treasury outflows that look like haulage but are not linked to a PO transport payment. Match each
              to a PO (link transport + post transport payment) or confirm as a general expense.
            </p>
          </div>
          <ul className="divide-y divide-rose-100/80 max-h-[420px] overflow-y-auto custom-scrollbar">
            {orphanRows.map((row) => (
              <li key={row.movementId} className="px-4 sm:px-5 py-3 text-[11px]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-rose-950">{row.movementId}</p>
                    <p className="text-slate-700 mt-0.5">
                      {row.counterpartyName || row.counterpartyId || 'Counterparty —'} · {row.type}
                    </p>
                    <p className="text-[10px] text-rose-900/80 mt-0.5">{row.reason}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {String(row.postedAtISO || '').slice(0, 10)} · {row.accountName || 'Account'}
                      {row.reference ? ` · Ref ${row.reference}` : ''}
                    </p>
                    {row.note ? (
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2" title={row.note}>
                        {row.note}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-black tabular-nums text-rose-950 shrink-0">{formatNgn(row.amountNgn)}</p>
                </div>
              </li>
            ))}
          </ul>
          {canFinancePay ? (
            <div className="px-4 sm:px-5 py-3 border-t border-rose-100/80 bg-white/50">
              <Link
                to="/accounts"
                state={{ accountsTab: 'movements' }}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-rose-950 hover:underline"
              >
                Review in Finance treasury movements
                <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
