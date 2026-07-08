import React, { useEffect, useMemo, useState } from 'react';
import {
  Receipt as ReceiptIcon,
  Wallet,
  Landmark,
  MoreVertical,
  Eye,
  Link2,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { loadLedgerEntries } from '../../lib/customerLedgerStore';
import { pendingAdvanceDepositRowsFromEntries } from '../../lib/customerLedgerCore';
import { dismissAdvanceEntryId, loadDismissedAdvanceIds } from '../../lib/advanceEntryUiStore';
import { formatNgn } from '../../Data/mockData';
import { receiptCashReceivedNgn } from '../../lib/salesReceiptsList';
import {
  receiptSalesPaymentStatusChipClass,
  receiptSalesPaymentStatusLabel,
  receiptSalesPaymentStatusTitle,
} from '../../lib/receiptClearance.js';
import { bankDepositStatusLabel, openBankDepositsFromSnapshot } from '../../lib/bankDeposits';

const PANEL_CLASS =
  'flex flex-col h-full min-h-[min(520px,72vh)] rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden';

function handleAdvanceDeleted(entryId, setLocallyDismissed) {
  const id = String(entryId || '').trim();
  if (!id) return;
  dismissAdvanceEntryId(id);
  setLocallyDismissed((prev) => {
    const next = new Set(prev);
    next.add(id);
    return next;
  });
}

function RowMenu({ rowKey, openKey, setOpenKey, onView, onLink, onDelete }) {
  const open = openKey === rowKey;
  return (
    <div className="relative shrink-0" data-sales-receipt-sidebar-menu>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenKey(open ? null : rowKey)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#134e4a]"
      >
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-[70] mb-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onView();
              setOpenKey(null);
            }}
          >
            <Eye size={14} className="text-slate-400" /> View
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onLink();
              setOpenKey(null);
            }}
          >
            <Link2 size={14} className="text-slate-400" /> Link to quote
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
            onClick={() => {
              onDelete();
              setOpenKey(null);
            }}
          >
            <Trash2 size={14} className="text-red-500" /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Column 1: receipt list (merged ledger + imported), same height as siblings */
export function ReceiptsTransactionsPanel({
  receipts = [],
  onOpenReceipt,
  className = '',
}) {
  const [sort, setSort] = useState('dateDesc');

  const sortedReceipts = useMemo(() => {
    const rows = [...receipts];
    rows.sort((a, b) => {
      if (sort === 'dateAsc') return String(a.dateISO || '').localeCompare(String(b.dateISO || ''));
      if (sort === 'dateDesc') return String(b.dateISO || '').localeCompare(String(a.dateISO || ''));
      if (sort === 'amountDesc') return receiptCashReceivedNgn(b) - receiptCashReceivedNgn(a);
      if (sort === 'amountAsc') return receiptCashReceivedNgn(a) - receiptCashReceivedNgn(b);
      if (sort === 'customer') return String(a.customer).localeCompare(String(b.customer));
      return 0;
    });
    return rows;
  }, [receipts, sort]);

  return (
    <section className={`${PANEL_CLASS} ${className}`}>
      <div className="h-1 bg-emerald-600 shrink-0" aria-hidden />
      <div className="p-4 border-b border-slate-100 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <ReceiptIcon size={14} className="text-emerald-600 shrink-0" />
          Receipt payments
        </p>
        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
          <strong>Quotation receipts only</strong> (money booked to a job). The same bank account in Finance shows{' '}
          <strong>every</strong> inflow—also <strong>advance deposits</strong>, transfers, expenses—so you may see a line
          on the treasury statement that is not listed here (check the statement badge: Sales receipt vs Advance).
        </p>
        <div className="relative mt-3">
          <label className="sr-only">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-[10px] font-semibold text-[#134e4a]"
          >
            <option value="dateDesc">Newest first</option>
            <option value="dateAsc">Oldest first</option>
            <option value="amountDesc">Amount high → low</option>
            <option value="amountAsc">Amount low → high</option>
            <option value="customer">Customer A–Z</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {sortedReceipts.length === 0 ? (
          <p className="text-[10px] text-slate-400 px-2 py-4 text-center">No receipts match the search.</p>
        ) : (
          sortedReceipts.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpenReceipt?.(r)}
              className="w-full text-left rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-white hover:border-teal-100 px-2.5 py-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      r.source === 'ledger' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {r.source === 'ledger' ? 'Ledger' : 'Imported'}
                  </span>
                  <span
                    className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded border ${receiptSalesPaymentStatusChipClass(r)}`}
                    title={receiptSalesPaymentStatusTitle(r)}
                  >
                    {receiptSalesPaymentStatusLabel(r)}
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 tabular-nums">{r.amount}</span>
              </div>
              <p className="text-[10px] font-bold text-[#134e4a] tabular-nums">{r.id}</p>
              <p className="text-[9px] font-semibold text-slate-700 truncate">{r.customer}</p>
              <p className="text-[8px] text-slate-400 tabular-nums">{r.date}</p>
              <p className="text-[8px] font-semibold text-slate-600 mt-1 leading-tight line-clamp-2" title={r._payBadge}>
                {r._payBadge}
              </p>
              <p className="text-[8px] text-slate-400 truncate">Quote: {r.quotationRef || '—'}</p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

/** Column 2: unlinked advances */
export function ReceiptsAdvancesPanel({
  ledgerNonce = 0,
  onSelectAdvance,
  onLinkAdvance,
  onDeleteAdvance,
  className = '',
}) {
  const [menuKey, setMenuKey] = useState(null);
  const [locallyDismissed, setLocallyDismissed] = useState(() => new Set());

  useEffect(() => {
    if (!menuKey) return;
    const onDown = (e) => {
      if (e.target.closest?.('[data-sales-receipt-sidebar-menu]')) return;
      setMenuKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuKey]);

  const advanceRows = useMemo(() => {
    void ledgerNonce;
    const dismissed = loadDismissedAdvanceIds();
    locallyDismissed.forEach((id) => dismissed.add(id));
    return pendingAdvanceDepositRowsFromEntries(loadLedgerEntries(), { dismissedIds: dismissed });
  }, [ledgerNonce, locallyDismissed]);

  return (
    <section className={`${PANEL_CLASS} border-amber-200/90 bg-amber-50/10 ${className}`}>
      <div className="h-1 bg-amber-500 shrink-0" aria-hidden />
      <div className="p-4 border-b border-amber-100/80 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-900/80 flex items-center gap-1.5">
          <Wallet size={14} className="shrink-0" />
          Advance deposits
        </p>
        <p className="text-[10px] text-amber-900/70 mt-1 leading-snug">
          Not yet linked to a quote. <strong>Link</strong> applies to a quotation; fully applied advances drop off this list.
        </p>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-visible custom-scrollbar p-2 space-y-1.5">
        {advanceRows.length === 0 ? (
          <li className="text-[10px] text-amber-800/60 px-2 py-4 text-center">No pending advances.</li>
        ) : (
          advanceRows.map((e) => (
            <li
              key={e.id}
              className={`flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/90 px-2.5 py-2${
                menuKey === e.id ? ' relative z-[60]' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#134e4a] tabular-nums">{formatNgn(e.remainingNgn ?? e.amountNgn)}</p>
                {e.originalAmountNgn != null && e.remainingNgn < e.originalAmountNgn ? (
                  <p className="text-[8px] font-semibold text-amber-800/80 tabular-nums">
                    of {formatNgn(e.originalAmountNgn)} remaining
                  </p>
                ) : null}
                <p className="text-[9px] font-semibold text-slate-700 truncate">{e.customerName || e.customerID}</p>
                <p className="text-[8px] text-slate-400">{(e.atISO || '').slice(0, 10)}</p>
              </div>
              <RowMenu
                rowKey={e.id}
                openKey={menuKey}
                setOpenKey={setMenuKey}
                onView={() => onSelectAdvance?.(e)}
                onLink={() => onLinkAdvance?.(e)}
                onDelete={async () => {
                  const removed = await onDeleteAdvance?.(e);
                  if (removed) handleAdvanceDeleted(e.id, setLocallyDismissed);
                }}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/** Column: unlinked bank deposits (Finance registered, Sales can link). */
export function ReceiptsUnlinkedDepositsPanel({
  snapshot,
  onUseDeposit,
  className = '',
}) {
  const rows = useMemo(() => openBankDepositsFromSnapshot(snapshot), [snapshot]);

  return (
    <section className={`${PANEL_CLASS} border-sky-200/90 bg-sky-50/10 ${className}`}>
      <div className="h-1 bg-sky-600 shrink-0" aria-hidden />
      <div className="p-4 border-b border-sky-100/80 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-900/80 flex items-center gap-1.5">
          <Landmark size={14} className="shrink-0" />
          Unlinked bank payments
        </p>
        <p className="text-[10px] text-sky-900/70 mt-1 leading-snug">
          Money Finance/Cashier registered from the bank — not yet linked to a customer. Use when posting a receipt or
          advance.
        </p>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1.5 max-h-[min(280px,40vh)]">
        {rows.length === 0 ? (
          <li className="text-[10px] text-sky-800/60 px-2 py-4 text-center">No unlinked bank payments.</li>
        ) : (
          rows.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-sky-100 bg-white/90 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#134e4a] tabular-nums">{formatNgn(d.remainingNgn)}</p>
                <p className="text-[9px] font-mono text-slate-600 truncate">{d.id}</p>
                <p className="text-[8px] text-slate-500 truncate" title={d.description}>
                  {d.description || d.bankReference || '—'}
                </p>
                <p className="text-[8px] text-slate-400">
                  {d.bankDateISO} · {bankDepositStatusLabel(d.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseDeposit?.(d)}
                className="shrink-0 rounded-md bg-sky-700 px-2 py-1 text-[8px] font-black uppercase text-white hover:bg-sky-800"
              >
                Use
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/** @deprecated Use ReceiptsTransactionsPanel + ReceiptsAdvancesPanel in a 3-column layout */
export default function SalesReceiptsSidebar(props) {
  return (
    <div className="space-y-5">
      <ReceiptsTransactionsPanel {...props} />
      <ReceiptsAdvancesPanel
        ledgerNonce={props.ledgerNonce}
        onSelectAdvance={props.onSelectAdvance}
        onLinkAdvance={props.onLinkAdvance}
        onDeleteAdvance={props.onDeleteAdvance}
      />
    </div>
  );
}
