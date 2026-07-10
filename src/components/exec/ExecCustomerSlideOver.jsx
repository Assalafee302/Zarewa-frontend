import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlideOverPanel } from '../layout/SlideOverPanel';
import { formatNgn } from '../../Data/mockData';
import { apiFetch } from '../../lib/apiBase';
import { getCachedCustomerBrief, setCachedCustomerBrief } from '../../lib/execDetailCache';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'ledger', label: 'Ledger' },
];

/**
 * Customer 360 slide-over for MD Customers tab.
 */
export function ExecCustomerSlideOver({ customer, isOpen, onClose }) {
  const c = customer && typeof customer === 'object' ? customer : null;
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryErr, setSummaryErr] = useState('');

  const loadBrief = useCallback(
    async (showSpinner = false) => {
      const id = String(c?.customerId || '').trim();
      if (!id) return;

      const cached = getCachedCustomerBrief(id);
      if (cached) {
        setSummary(cached);
        setSummaryErr('');
        return;
      }

      if (showSpinner) setSummaryBusy(true);
      setSummaryErr('');
      const { ok, data } = await apiFetch(`/api/exec/customers/${encodeURIComponent(id)}/brief`);
      if (showSpinner) setSummaryBusy(false);
      if (!ok || !data?.ok) {
        if (showSpinner) {
          setSummary(null);
          setSummaryErr(data?.error || 'Could not load customer detail.');
        }
        return;
      }
      setCachedCustomerBrief(id, data);
      setSummary(data);
    },
    [c?.customerId]
  );

  useEffect(() => {
    if (!isOpen || !c?.customerId) {
      setSummary(null);
      setSummaryErr('');
      setTab('overview');
      return;
    }

    const cached = getCachedCustomerBrief(c.customerId);
    if (cached) {
      setSummary(cached);
      return;
    }

    if (tab === 'overview') {
      void loadBrief(false);
    }
  }, [isOpen, c?.customerId, loadBrief, tab]);

  useEffect(() => {
    if (!isOpen || !c?.customerId || tab === 'overview') return;
    void loadBrief(true);
  }, [tab, isOpen, c?.customerId, loadBrief]);

  if (!c) return null;

  const quotes = summary?.outstandingByQuotation || [];
  const ledgerEntries = summary?.entries || [];

  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title="Customer brief" maxWidthClass="max-w-lg">
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-100 px-5 py-4">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Customer</p>
          <h2 className="text-lg font-bold text-zarewa-teal">{c.customerName}</h2>
          <p className="text-xs text-slate-500 mt-1">{c.customerId}</p>
          <span className="mt-2 inline-flex rounded-md px-2 py-0.5 text-ui-xs font-black uppercase ring-1 border-teal-200 bg-teal-50 text-teal-900">
            {c.segmentLabel || c.segment}
          </span>
          <nav className="mt-4 flex gap-1 border-b border-slate-100 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-ui-xs font-black uppercase border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-zarewa-teal text-zarewa-teal'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {summaryErr && tab !== 'overview' ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {summaryErr}
            </p>
          ) : null}

          {tab === 'overview' ? (
            <>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-ui-xs font-bold uppercase text-slate-500">Collected</dt>
                  <dd className="font-black text-zarewa-teal tabular-nums">{formatNgn(c.netCollectedNgn ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-ui-xs font-bold uppercase text-slate-500">Outstanding</dt>
                  <dd className="font-bold tabular-nums">{c.debtNgn > 0 ? formatNgn(c.debtNgn) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-ui-xs font-bold uppercase text-slate-500">Receipts</dt>
                  <dd>{c.receiptCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-ui-xs font-bold uppercase text-slate-500">Aging band</dt>
                  <dd>{c.primaryAgingBand || '—'}</dd>
                </div>
                {summary ? (
                  <>
                    <div>
                      <dt className="text-ui-xs font-bold uppercase text-slate-500">Advance</dt>
                      <dd className="tabular-nums">{formatNgn(summary.advanceNgn ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-ui-xs font-bold uppercase text-slate-500">Receipt total</dt>
                      <dd className="tabular-nums">{formatNgn(summary.receiptTotalNgn ?? 0)}</dd>
                    </div>
                  </>
                ) : summaryErr ? (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">{summaryErr}</p>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Loading advance balance…</p>
                  </div>
                )}
              </dl>
              {c.debtRiskLabel ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  {c.debtRiskLabel}
                </p>
              ) : null}
            </>
          ) : null}

          {tab === 'quotes' ? (
            <div className="space-y-2">
              {summaryBusy ? (
                <p className="text-xs text-slate-500">Loading quotations…</p>
              ) : quotes.length === 0 ? (
                <p className="text-xs text-slate-500">No quotations in scope.</p>
              ) : (
                quotes.map((q) => (
                  <div
                    key={q.quotationId}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
                  >
                    <Link
                      to={`/sales?quotation=${encodeURIComponent(q.quotationId)}`}
                      className="font-bold text-zarewa-teal hover:underline"
                    >
                      {q.quotationId}
                    </Link>
                    <p className="text-slate-600 mt-0.5 tabular-nums">
                      Total {formatNgn(q.totalNgn ?? 0)} · Paid {formatNgn(q.paidNgn ?? 0)} · Due{' '}
                      {formatNgn(q.amountDueNgn ?? 0)}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === 'ledger' ? (
            <div className="space-y-2">
              {summaryBusy ? (
                <p className="text-xs text-slate-500">Loading ledger…</p>
              ) : ledgerEntries.length === 0 ? (
                <p className="text-xs text-slate-500">No ledger entries in scope.</p>
              ) : (
                ledgerEntries.map((e, i) => (
                  <div
                    key={`${e.id || e.atISO}-${i}`}
                    className="flex justify-between gap-2 border-b border-slate-50 pb-2 text-xs"
                  >
                    <span className="text-slate-600 truncate">
                      {String(e.type || 'Entry').replace(/_/g, ' ')}
                      {e.reference ? ` · ${e.reference}` : ''}
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {formatNgn(e.amountNgn ?? 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
        <footer className="border-t border-slate-100 px-5 py-4 flex flex-wrap gap-2">
          <Link
            to={`/customers/${encodeURIComponent(c.customerId)}`}
            className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-black uppercase text-white hover:brightness-105"
          >
            Open customer record
          </Link>
          <Link
            to="/sales"
            className="rounded-lg border border-slate-200 px-4 py-2 text-ui-xs font-bold uppercase text-slate-700 hover:bg-slate-50"
          >
            Sales desk
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-ui-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </SlideOverPanel>
  );
}
