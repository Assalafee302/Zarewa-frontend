import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';

function scrollToId(id) {
  if (!id || typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Cashier till board — ink counts like manager Floor now. Tiles jump to the matching queue.
 */
export function FinanceDeskTillStrip({
  bookTotalNgn = 0,
  pendingReceipts = 0,
  pendingReceiptsNgn = 0,
  payouts = 0,
  confirmedToday = 0,
}) {
  const tiles = [
    {
      key: 'book',
      label: 'Book balance',
      value: formatNgn(bookTotalNgn),
      meta: 'Till and bank on this branch',
      warn: false,
      scrollTo: 'desk-accounts',
    },
    {
      key: 'confirm',
      label: 'To confirm',
      value: pendingReceipts,
      meta: pendingReceipts > 0 ? formatNgn(pendingReceiptsNgn) : 'Nothing waiting',
      warn: pendingReceipts > 0,
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
      meta: 'Receipts you cleared today',
      warn: false,
      scrollTo: 'desk-queue-receipts',
    },
  ];

  return (
    <section aria-label="Till now">
      <div className="mb-2">
        <p className="text-ui-xs font-medium text-slate-500">Till now</p>
        <p className="mt-0.5 text-xs text-slate-600">Confirm money in, then pay what is already approved.</p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 lg:grid-cols-4">
        {tiles.map((t) => (
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
