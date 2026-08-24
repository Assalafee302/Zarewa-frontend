import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { FinanceSequencePanel } from '../layout';
import { formatNgn } from '../../lib/formatNgn';
import { waitTone } from '../../lib/managerWatchQueues';

function toneClass(tone) {
  if (tone === 'urgent') return 'border-rose-200 bg-rose-50 text-rose-950';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (tone === 'watch') return 'border-amber-100 bg-amber-50/70 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function WaitChip({ hours }) {
  const { label, tone } = waitTone(hours);
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${toneClass(tone)}`}
    >
      {label}
    </span>
  );
}

function KpiTile({ label, value, hint, warn, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl border bg-white px-3 py-3 text-left ${
        warn ? 'border-amber-200' : 'border-slate-200/80'
      } ${onClick ? 'hover:border-zarewa-teal' : ''}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black tabular-nums ${warn ? 'text-amber-950' : 'text-zarewa-teal'}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </Tag>
  );
}

function QueuePanel({ id, title, subtitle, href, hrefLabel, queue, showAmount = false, empty }) {
  return (
    <FinanceSequencePanel id={id} className="!min-h-0 sm:!min-h-0 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zarewa-teal">{title}</h3>
          <p className="text-[11px] text-slate-500">
            {subtitle}
            {queue.count ? ` · ${queue.count} waiting` : ''}
            {queue.agedCount ? ` · ${queue.agedCount} past 24h` : ''}
          </p>
        </div>
        {href ? (
          <Link
            to={href}
            className="shrink-0 text-[11px] font-semibold text-slate-600 no-underline hover:text-zarewa-teal"
          >
            {hrefLabel || 'Open desk'}
          </Link>
        ) : null}
      </div>
      {!queue.count ? (
        <p className="py-4 text-center text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {queue.items.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 py-2 first:pt-0">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-zarewa-teal">{row.title}</p>
                <p className="truncate text-[11px] text-slate-600">{row.subtitle}</p>
                <p className="text-[11px] text-slate-500">{row.reason}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <WaitChip hours={row.waitHours} />
                {showAmount && row.amountNgn ? (
                  <span className="text-[11px] font-semibold tabular-nums text-slate-700">
                    {formatNgn(row.amountNgn)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {queue.overflow > 0 ? (
        <p className="pt-2 text-[11px] font-semibold text-slate-500">+{queue.overflow} more on the desk</p>
      ) : null}
    </FinanceSequencePanel>
  );
}

function oldestHint(hours, fallback) {
  if (hours == null) return fallback;
  return `Oldest ${waitTone(hours).label}`;
}

function emptyModel() {
  const emptyQ = { items: [], count: 0, agedCount: 0, oldestHours: null, overflow: 0, totalNgn: 0 };
  return {
    production: emptyQ,
    receipts: emptyQ,
    expenses: emptyQ,
    refunds: emptyQ,
    coilRequests: emptyQ,
    millBlocked: emptyQ,
    banks: { accounts: [], totalNgn: 0, bankNgn: 0, cashNgn: 0 },
    totals: { waitingCount: 0, agedCount: 0, oldestHours: null },
  };
}

/**
 * Compact strip on Branch — counts + oldest wait, opens Watch.
 */
export function ManagerWatchGlance({ model, onOpenWatch }) {
  const m = model || emptyModel();
  const t = m.totals;
  const tiles = [
    {
      key: 'production',
      label: 'Cutting lists',
      value: m.production.count,
      hint: oldestHint(m.production.oldestHours, 'Awaiting mill'),
      warn: m.production.agedCount > 0,
      section: 'watch-production',
    },
    {
      key: 'receipts',
      label: 'Receipts',
      value: m.receipts.count,
      hint: m.receipts.totalNgn ? `${formatNgn(m.receipts.totalNgn)} unconfirmed` : 'Awaiting cashier confirm',
      warn: m.receipts.agedCount > 0,
      section: 'watch-receipts',
    },
    {
      key: 'expenses',
      label: 'Expenses to pay',
      value: m.expenses.count,
      hint: m.expenses.totalNgn ? `${formatNgn(m.expenses.totalNgn)} approved unpaid` : 'Approved, not paid',
      warn: m.expenses.agedCount > 0,
      section: 'watch-expenses',
    },
    {
      key: 'cash',
      label: 'Cash on hand',
      value: formatNgn(m.banks.totalNgn),
      hint: `${m.banks.accounts.length} bank / till account(s)`,
      warn: false,
      section: 'watch-banks',
    },
  ];

  return (
    <section className="space-y-2" aria-label="Waiting on the floor">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zarewa-teal">Waiting on the floor</h3>
          <p className="text-[11px] text-slate-500">
            {t.waitingCount
              ? `${t.waitingCount} item${t.waitingCount === 1 ? '' : 's'} still sitting${
                  t.agedCount ? ` · ${t.agedCount} past 24h` : ''
                }`
              : 'Nothing aged in production, cash, or payout queues'}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-zarewa-teal hover:text-zarewa-teal"
          onClick={() => onOpenWatch?.()}
        >
          Open Watch
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <KpiTile
            key={tile.key}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            warn={tile.warn}
            onClick={() => onOpenWatch?.(tile.section)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Dedicated Watch desk — aged queues a branch manager must keep eyes on.
 */
export function ManagerWatchTab({ model, loading = false }) {
  const m = model || emptyModel();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Watch</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          How long work has been sitting — mill, cashier confirmation, payouts, and cash in each account.
          {loading ? ' Refreshing…' : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Cutting lists"
          value={m.production.count}
          hint={oldestHint(m.production.oldestHours, 'None waiting')}
          warn={m.production.agedCount > 0}
        />
        <KpiTile
          label="Receipts to confirm"
          value={m.receipts.count}
          hint={m.receipts.totalNgn ? formatNgn(m.receipts.totalNgn) : 'None waiting'}
          warn={m.receipts.agedCount > 0}
        />
        <KpiTile
          label="Expenses to pay"
          value={m.expenses.count}
          hint={m.expenses.totalNgn ? formatNgn(m.expenses.totalNgn) : 'None waiting'}
          warn={m.expenses.agedCount > 0}
        />
        <KpiTile
          label="Cash on hand"
          value={formatNgn(m.banks.totalNgn)}
          hint={`Bank ${formatNgn(m.banks.bankNgn)} · Till ${formatNgn(m.banks.cashNgn)}`}
        />
      </div>

      <FinanceSequencePanel id="watch-banks" className="!min-h-0 sm:!min-h-0 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zarewa-teal">
            <Landmark size={15} aria-hidden />
            Available in each bank
          </h3>
          <Link
            to="/accounts"
            className="text-[11px] font-semibold text-slate-600 no-underline hover:text-zarewa-teal"
          >
            Treasury
          </Link>
        </div>
        {!m.banks.accounts.length ? (
          <p className="py-4 text-center text-xs text-slate-500">No branch treasury accounts in this snapshot.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {m.banks.accounts.map((acc) => (
              <li key={acc.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{acc.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {acc.type}
                    {acc.accNo && acc.accNo !== 'N/A' ? ` · ${acc.accNo}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black tabular-nums text-zarewa-teal">{formatNgn(acc.bookNgn)}</p>
              </li>
            ))}
          </ul>
        )}
      </FinanceSequencePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <QueuePanel
          id="watch-production"
          title="Cutting lists awaiting production"
          subtitle="Not registered on the mill, or still on a release hold"
          href="/operations"
          hrefLabel="Operations"
          queue={m.production}
          empty="No cutting lists waiting on production."
        />
        <QueuePanel
          id="watch-receipts"
          title="Receipts awaiting confirmation"
          subtitle="Posted by sales — cashier has not confirmed bank or cash"
          href="/accounts"
          hrefLabel="Cashier desk"
          queue={m.receipts}
          showAmount
          empty="No receipts waiting on cashier confirmation."
        />
        <QueuePanel
          id="watch-expenses"
          title="Expenses awaiting payment"
          subtitle="You already approved these — cashier has not paid"
          href="/manager?tab=spend"
          hrefLabel="Expenses"
          queue={m.expenses}
          showAmount
          empty="No approved expenses waiting on payout."
        />
        <QueuePanel
          id="watch-refunds"
          title="Refunds awaiting payout"
          subtitle="Approved refunds still holding customer cash"
          href="/sales"
          hrefLabel="Sales"
          queue={m.refunds}
          showAmount
          empty="No approved refunds waiting on payout."
        />
        <QueuePanel
          id="watch-coil"
          title="Stock requests awaiting you"
          subtitle="Store raised — waiting on branch manager approve"
          href="/operations"
          hrefLabel="Operations"
          queue={m.coilRequests}
          empty="No pending coil or stock requests."
        />
        <QueuePanel
          id="watch-mill"
          title="Mill blocked or overdue"
          subtitle="Jobs with no coil, conversion review, or past due date"
          href="/operations"
          hrefLabel="Operations"
          queue={m.millBlocked}
          empty="No blocked or overdue mill jobs."
        />
      </div>
    </div>
  );
}
