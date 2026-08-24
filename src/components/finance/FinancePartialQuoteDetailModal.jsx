/**
 * Receipts-tab popup: money story, quote lines, and payments on a partial quotation.
 */
import React, { useMemo } from 'react';
import { ModalFrame, ModalScrollShell, ModalScrollBody, ModalActionFooter } from '../layout';
import { formatNgn } from '../../Data/mockData';
import { flattenQuotationLineItems } from '../../lib/managerDashboardCore';
import { quotationBalanceTransactions } from '../../lib/quotationPaymentSummary.js';
import { quotationColourGaugeLabel } from '../../lib/quotationColourGauge.js';

function MoneyRow({ label, value, tone }) {
  const cls =
    tone === 'rose' ? 'text-rose-800' : tone === 'emerald' ? 'text-emerald-800' : 'text-slate-900';
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-black tabular-nums ${cls}`}>{formatNgn(value)}</span>
    </div>
  );
}

export function FinancePartialQuoteDetailModal({
  row,
  isOpen,
  onClose,
  receipts = [],
  ledgerEntries = [],
  onOpenReceipt,
}) {
  const quote = row?.quotation || null;
  const spec = quotationColourGaugeLabel(quote) || row?.spec || '';
  const lines = useMemo(() => flattenQuotationLineItems(quote || {}), [quote]);
  const transactions = useMemo(
    () =>
      quotationBalanceTransactions({
        quotationId: row?.id,
        receipts,
        ledgerEntries,
      }),
    [row?.id, receipts, ledgerEntries]
  );

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title={`Quotation ${row?.id || ''}`} surface="plain">
      <ModalScrollShell size="lg">
        <ModalScrollBody>
          <div className="space-y-4">
            <div>
              <p className="font-mono text-sm font-bold text-zarewa-teal">{row?.id || '—'}</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{row?.customer || '—'}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[row?.date, spec].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-900/80">Balance</p>
              <MoneyRow label="Quote total" value={row?.total || 0} />
              <MoneyRow label="Paid in" value={row?.paid || 0} tone="emerald" />
              <MoneyRow label="Still due" value={row?.balance || 0} tone="rose" />
            </div>

            {lines.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
                <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Quote lines</p>
                <ul className="space-y-1">
                  {lines.slice(0, 16).map((line, idx) => (
                    <li key={line.id || `${line.category}-${idx}`} className="flex justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-slate-700" title={line.name}>
                        {line.name}
                        {line.colour || line.gauge ? (
                          <span className="text-slate-400">
                            {' '}
                            · {[line.colour, line.gauge].filter(Boolean).join(' / ')}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-800">
                        {line.qty !== '' && line.qty != null ? `${line.qty} · ` : ''}
                        {line.lineTotal !== '' && line.lineTotal != null ? formatNgn(line.lineTotal) : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-1.5">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Transactions</p>
              {transactions.length === 0 ? (
                <p className="text-xs text-slate-500">No receipts or money ledger on this quotation yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {transactions.map((tx) => (
                    <li
                      key={tx.key}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-zarewa-teal">{tx.id}</p>
                        <p className="text-xs text-slate-600">
                          {tx.date || '—'} · {tx.label}
                          {tx.statusLabel ? ` · ${tx.statusLabel}` : ''}
                        </p>
                        {tx.detail ? (
                          <p className="mt-0.5 text-ui-xs text-slate-500 line-clamp-2" title={tx.detail}>
                            {tx.detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p
                          className={`z-stencil text-sm font-semibold ${
                            tx.amountNgn < 0 ? 'text-rose-800' : 'text-zarewa-teal'
                          }`}
                        >
                          {formatNgn(tx.amountNgn)}
                        </p>
                        {tx.kind === 'receipt' && tx.receipt && onOpenReceipt ? (
                          <button
                            type="button"
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-ui-xs font-semibold text-slate-700 hover:bg-slate-200"
                            onClick={() => onOpenReceipt(tx.receipt)}
                          >
                            Open receipt
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ModalScrollBody>
        <ModalActionFooter onCancel={onClose} cancelLabel="Close" />
      </ModalScrollShell>
    </ModalFrame>
  );
}
