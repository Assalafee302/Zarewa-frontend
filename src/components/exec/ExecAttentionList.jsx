import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { summarizeAttention } from '../../shared/lib/attentionRules.js';
import { AttentionFromDateNote } from '../attention/AttentionFromDateNote.jsx';

const DOT = {
  critical: 'bg-rose-600',
  warning: 'bg-amber-500',
  info: 'bg-slate-400',
};

function OrderToggle({ order, onChange }) {
  const btn = (id, label) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={order === id}
      className={`min-h-8 px-2.5 py-1 text-[11px] font-semibold ${
        order === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Sort">
      {btn('newest', 'Newest first')}
      {btn('oldest', 'Oldest first')}
    </div>
  );
}

function AttentionRow({ row, onOpen, formatNgn }) {
  const { item, attention } = row;
  const more = attention.flags.slice(1);
  // Show the record reference (RF-…, QT-…) when the sentence does not already name it; skip descriptive titles.
  const ref = /\d/.test(String(item.title || '')) && !attention.sentence.includes(item.title) ? item.title : '';
  const meta = [item.branchName, ref]
    .filter(Boolean)
    .join(' · ');
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        data-testid="attention-row"
        data-attention-id={item.id}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[attention.severity] || DOT.info}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-snug text-slate-900">{attention.sentence}</span>
          {more.length > 0 ? (
            <span className="mt-0.5 block text-[11px] font-semibold text-rose-800">
              Also: {more.map((f) => f.label.toLowerCase()).join('; ')}
            </span>
          ) : null}
          {meta ? <span className="mt-0.5 block truncate text-[11px] text-slate-500">{meta}</span> : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-bold tabular-nums text-slate-900">
            {attention.amountNgn != null && attention.amountNgn !== 0 ? formatNgn(attention.amountNgn) : '—'}
          </span>
          <span className="block text-[11px] text-slate-500">{attention.ageLabel || '—'}</span>
        </span>
        <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
      </button>
    </li>
  );
}

/**
 * MD "Needs your attention": grouped by type with counts and ₦ totals; each row is the problem in one sentence.
 * Counts, totals, sentences all come from `summarizeAttention` (shared rules) — never computed here.
 */
export function ExecAttentionList({
  items = [],
  busy = false,
  onOpen,
  formatNgn,
  limits,
  title = 'Needs your attention',
  emptyText = 'Nothing is waiting for you.',
  attentionFromDate = '',
  hiddenOlderCount = 0,
}) {
  const [order, setOrder] = useState('newest');
  const summary = useMemo(() => summarizeAttention(items, { order, limits }), [items, order, limits]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-label={title} data-testid="exec-attention-list">
      <header className="flex flex-col gap-2 border-b border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-ui-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-900" data-testid="attention-summary">
            {summary.total} item{summary.total === 1 ? '' : 's'}
            {summary.totalNgn ? ` · ${formatNgn(summary.totalNgn)}` : ''}
          </p>
        </div>
        <OrderToggle order={order} onChange={setOrder} />
      </header>

      {busy && summary.total === 0 ? (
        <div className="space-y-2 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : null}
      {!busy && summary.total === 0 ? <p className="py-8 text-center text-xs text-slate-500">{emptyText}</p> : null}

      {summary.groups.map((g) => (
        <section key={g.group} aria-label={g.label} data-testid={`attention-group-${g.group}`}>
          <h3 className="flex items-baseline justify-between gap-2 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <span>
              {g.label} <span className="text-slate-400">· {g.count}</span>
            </span>
            {g.totalNgn ? <span className="tabular-nums text-slate-700">{formatNgn(g.totalNgn)}</span> : null}
          </h3>
          <ul className="divide-y divide-slate-100">
            {g.rows.map((row) => (
              <AttentionRow key={row.item.id} row={row} onOpen={onOpen} formatNgn={formatNgn} />
            ))}
          </ul>
        </section>
      ))}
      <AttentionFromDateNote fromDate={attentionFromDate} hiddenCount={hiddenOlderCount} formatNgn={formatNgn} />
    </section>
  );
}
