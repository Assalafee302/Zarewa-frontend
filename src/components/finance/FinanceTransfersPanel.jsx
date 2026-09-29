import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Search,
  Printer,
  Pencil,
  Trash2,
  Landmark,
  Wallet,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatNgn } from '../../Data/mockData.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { printTreasuryLodgementVoucher } from '../../lib/treasuryLodgementPrint.js';

export function FinanceTransfersPanel({
  movementRows = [],
  onNewTransfer,
  onEditTransfer,
  onDeleteTransfer,
  canEdit = false,
  canDelete = false,
  deletingBatchId = '',
}) {
  const ws = useWorkspace();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, lodgement, internal

  const branchLabel = ws?.snapshot?.branch?.name || ws?.workspaceBranchId || 'Branch';

  const enrichedRows = useMemo(() => {
    return movementRows.map((m) => {
      const fromLower = String(m.fromName || '').toLowerCase();
      const toLower = String(m.toName || '').toLowerCase();
      const isLodgement =
        (fromLower.includes('cash') || fromLower.includes('safe') || fromLower.includes('till')) &&
        (toLower.includes('bank') || toLower.includes('zenith') || toLower.includes('gtb') || toLower.includes('access') || toLower.includes('uba'));

      return {
        ...m,
        isLodgement,
      };
    });
  }, [movementRows]);

  const stats = useMemo(() => {
    let totalNgn = 0;
    let lodgementCount = 0;
    let lodgementNgn = 0;
    let internalCount = 0;
    let internalNgn = 0;

    for (const row of enrichedRows) {
      const amt = Number(row.amountNgn) || 0;
      totalNgn += amt;
      if (row.isLodgement) {
        lodgementCount++;
        lodgementNgn += amt;
      } else {
        internalCount++;
        internalNgn += amt;
      }
    }

    return {
      totalCount: enrichedRows.length,
      totalNgn,
      lodgementCount,
      lodgementNgn,
      internalCount,
      internalNgn,
    };
  }, [enrichedRows]);

  const filteredRows = useMemo(() => {
    return enrichedRows.filter((m) => {
      if (typeFilter === 'lodgement' && !m.isLodgement) return false;
      if (typeFilter === 'internal' && m.isLodgement) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        String(m.id || '').toLowerCase().includes(q) ||
        String(m.fromName || '').toLowerCase().includes(q) ||
        String(m.toName || '').toLowerCase().includes(q) ||
        String(m.displayReference || '').toLowerCase().includes(q) ||
        String(m.amountNgn || '').includes(q)
      );
    });
  }, [enrichedRows, typeFilter, search]);

  function handlePrintSlip(m) {
    printTreasuryLodgementVoucher({
      transferId: m.id,
      dateISO: m.at,
      fromAccountName: m.fromName,
      toAccountName: m.toName,
      amountNgn: m.amountNgn,
      reference: m.displayReference,
      branchLabel,
      postedBy: ws?.session?.user?.name || ws?.session?.user?.email || 'Cashier Desk',
    });
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Transferred</span>
            <ArrowRightLeft size={16} className="text-zarewa-teal" />
          </div>
          <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">
            {formatNgn(stats.totalNgn)}
          </p>
          <p className="text-ui-xs text-slate-500 mt-0.5">{stats.totalCount} movement records</p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bank Lodgements</span>
            <Landmark size={16} className="text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-black tabular-nums text-emerald-950">
            {formatNgn(stats.lodgementNgn)}
          </p>
          <p className="text-ui-xs text-emerald-800/80 mt-0.5">{stats.lodgementCount} cash safe → bank deposits</p>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Internal Transfers</span>
            <Wallet size={16} className="text-sky-600" />
          </div>
          <p className="mt-1 text-xl font-black tabular-nums text-sky-950">
            {formatNgn(stats.internalNgn)}
          </p>
          <p className="text-ui-xs text-sky-800/80 mt-0.5">{stats.internalCount} till &amp; account reallocations</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[12rem] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="search"
              placeholder="Search reference, account, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-zarewa-teal/15 focus:border-teal-400"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { id: 'all', label: 'All Transfers' },
              { id: 'lodgement', label: 'Bank Lodgements' },
              { id: 'internal', label: 'Internal Moves' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  typeFilter === tab.id
                    ? 'bg-white text-zarewa-teal shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onNewTransfer}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zarewa-teal px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-[0.98] transition shrink-0"
        >
          <Plus size={15} />
          New Transfer
        </button>
      </div>

      {/* List / Table */}
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <ArrowRightLeft className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No transfers found</p>
          <p className="text-ui-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || typeFilter !== 'all'
              ? 'No movements match your current search or filter.'
              : 'Record cash lodgements or till balance movements to begin.'}
          </p>
          {onNewTransfer && !search && typeFilter === 'all' && (
            <button
              type="button"
              onClick={onNewTransfer}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-zarewa-teal hover:bg-teal-100"
            >
              <Plus size={14} /> Record First Transfer
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredRows.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-slate-50/80 transition-colors"
              >
                {/* Left details */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-zarewa-teal">
                      {m.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        m.isLodgement
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border border-sky-200 bg-sky-50 text-sky-900'
                      }`}
                    >
                      {m.isLodgement ? (
                        <>
                          <Landmark size={11} /> Bank Lodgement
                        </>
                      ) : (
                        <>
                          <Wallet size={11} /> Internal Transfer
                        </>
                      )}
                    </span>
                    <span className="text-ui-xs text-slate-400 tabular-nums">
                      {m.at}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="truncate max-w-[14rem]" title={m.fromName}>
                      {m.fromName}
                    </span>
                    <ArrowRight size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[14rem] text-teal-800" title={m.toName}>
                      {m.toName}
                    </span>
                  </div>

                  {m.displayReference ? (
                    <p className="text-ui-xs text-slate-500 font-medium truncate">
                      Ref: <span className="font-mono">{m.displayReference}</span>
                    </p>
                  ) : null}
                </div>

                {/* Right amount and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-black tabular-nums text-zarewa-teal font-mono">
                      {formatNgn(m.amountNgn)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Print official lodgement slip"
                      onClick={() => handlePrintSlip(m)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-zarewa-teal transition shadow-2xs"
                    >
                      <Printer size={13} />
                      <span className="hidden md:inline">Print Slip</span>
                    </button>

                    {m.isTreasuryTransfer && canEdit && onEditTransfer ? (
                      <button
                        type="button"
                        title="Edit transfer"
                        onClick={() => onEditTransfer(m)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-zarewa-teal hover:bg-teal-50 transition"
                      >
                        <Pencil size={13} />
                      </button>
                    ) : null}

                    {m.isTreasuryTransfer && canDelete && onDeleteTransfer ? (
                      <button
                        type="button"
                        title="Delete transfer (Admin/MD)"
                        disabled={deletingBatchId === m.id}
                        onClick={() => onDeleteTransfer(m.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
