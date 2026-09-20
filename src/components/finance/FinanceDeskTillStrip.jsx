import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';

function scrollToId(id) {
  if (!id || typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function lastMovementMeta(lane) {
  const iso = String(lane?.lastPostedAtISO || '').trim();
  if (!iso) return 'No movement yet';
  const day = iso.slice(0, 10);
  const name = String(lane?.lastAccountName || '').trim();
  const amt = Math.round(Number(lane?.lastAmountNgn) || 0);
  return [day, name, amt ? formatNgn(amt) : ''].filter(Boolean).join(' · ');
}

/**
 * Cashier till board — Cash / POS / Bank from live treasury_accounts.balance
 * (same column payouts debit), plus uncleared receipts and payout queues.
 */
export function FinanceDeskTillStrip({
  tillTruth = null,
  bookTotalNgn = 0,
  pendingReceipts = 0,
  pendingReceiptsNgn = 0,
  payouts = 0,
  confirmedToday = 0,
}) {
  const cashNgn = tillTruth?.cashNgn ?? 0;
  const posNgn = tillTruth?.posNgn ?? 0;
  const bankNgn = tillTruth?.bankNgn ?? 0;
  const unclearedCount =
    tillTruth?.unclearedCount != null ? tillTruth.unclearedCount : pendingReceipts;
  const unclearedNgn =
    tillTruth?.unclearedNgn != null ? tillTruth.unclearedNgn : pendingReceiptsNgn;
  const last = tillTruth?.lastMovement || {};

  const lanes = [
    {
      key: 'cash',
      label: 'Cash',
      value: formatNgn(cashNgn),
      meta: lastMovementMeta(last.cash),
      warn: false,
      scrollTo: 'desk-accounts',
    },
    {
      key: 'pos',
      label: 'POS',
      value: formatNgn(posNgn),
      meta: lastMovementMeta(last.pos),
      warn: false,
      scrollTo: 'desk-accounts',
    },
    {
      key: 'bank',
      label: 'Bank',
      value: formatNgn(bankNgn),
      meta: lastMovementMeta(last.bank),
      warn: false,
      scrollTo: 'desk-accounts',
    },
  ];

  const queues = [
    {
      key: 'confirm',
      label: 'To confirm',
      value: unclearedCount,
      meta: unclearedCount > 0 ? formatNgn(unclearedNgn) : 'Nothing waiting',
      warn: unclearedCount > 0,
      warnLabel: 'Confirm',
      scrollTo: 'desk-queue-receipts',
    },
    {
      key: 'pay',
      label: 'To pay',
      value: payouts,
      meta: payouts > 0 ? 'Approved payouts' : 'Nothing queued',
      warn: payouts > 0,
      warnLabel: 'Pay',
      scrollTo: 'desk-queue-payouts',
    },
    {
      key: 'today',
      label: 'Confirmed today',
      value: confirmedToday,
      meta: bookTotalNgn
        ? `Till total ${formatNgn(tillTruth?.totalNgn ?? bookTotalNgn)}`
        : 'Receipts you cleared today',
      warn: false,
      scrollTo: 'desk-queue-receipts',
    },
  ];

  return (
    <section aria-label="Till now">
      <div className="mb-2">
        <p className="text-ui-xs font-medium text-slate-500">Till now</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Live Cash, POS, and Bank — the same balances payouts debit. Confirm money in, then pay what is
          already approved.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-t-md border border-b-0 border-slate-200 bg-slate-200">
        {lanes.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => scrollToId(t.scrollTo)}
            className="bg-white p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal"
          >
            <p className="text-ui-xs font-medium text-slate-500">{t.label}</p>
            <p className="z-stencil mt-1.5 text-lg tabular-nums text-slate-900">{t.value}</p>
            <p className="mt-1 text-ui-xs leading-snug text-slate-500">{t.meta}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-md border border-slate-200 bg-slate-200">
        {queues.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => scrollToId(t.scrollTo)}
            className="bg-white p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal"
          >
            <p className="text-ui-xs font-medium text-slate-500">{t.label}</p>
            <p className={`z-stencil mt-1.5 text-lg tabular-nums ${t.warn ? 'text-rose-900' : 'text-slate-900'}`}>
              {t.value}
            </p>
            {t.warn && t.warnLabel ? (
              <p className="mt-1 inline-flex items-center gap-1 text-ui-xs font-semibold text-rose-900">
                <AlertTriangle size={12} aria-hidden />
                {t.warnLabel}
              </p>
            ) : null}
            <p className="mt-1 text-ui-xs leading-snug text-slate-500">{t.meta}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
