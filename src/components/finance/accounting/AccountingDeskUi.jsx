import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { Link } from 'react-router-dom';

/** Matches Procurement list row chrome */
export const ACCOUNTING_CARD_ROW =
  'rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm transition-colors hover:bg-white/70';

export const ACCOUNTING_REGISTER_SORT_FIELDS = [
  { id: 'amount', label: 'Amount' },
  { id: 'party', label: 'Party' },
  { id: 'reference', label: 'Reference' },
];

/**
 * @param {{ icon?: React.ReactNode; label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'teal' | 'amber' }} props
 */
export function AccountingDeskKpiCard({ icon, label, value, hint, tone = 'default' }) {
  const toneClass =
    tone === 'teal'
      ? 'border-teal-200 bg-teal-50/40'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/50'
        : 'border-slate-200 bg-white';
  const labelClass =
    tone === 'teal' ? 'text-teal-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-500';
  const valueClass =
    tone === 'amber' ? 'text-amber-900' : 'text-[#134e4a]';

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className={`text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${labelClass}`}>
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueClass}`}>{value}</p>
      {hint ? (
        <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100/80 pt-2 leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * @param {{ title: string; description?: string; action?: React.ReactNode }} props
 */
export function AccountingDeskPageIntro({ title, description, action }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="h-1 bg-[#134e4a]" />
      <div className="px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[#134e4a]">{title}</h2>
          {description ? (
            <p className="mt-1 text-[10px] text-slate-500 leading-snug max-w-2xl">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2 shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * @param {{ tone?: 'info' | 'trial' | 'warn'; children: React.ReactNode }} props
 */
export function AccountingDeskNotice({ tone = 'info', children }) {
  const cls =
    tone === 'trial'
      ? 'border-teal-200/80 bg-teal-50/40 text-[#134e4a]'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50/50 text-amber-900'
        : 'border-slate-200 bg-white text-slate-600';
  return (
    <div className={`rounded-2xl border px-4 py-3 text-[11px] font-medium leading-relaxed ${cls}`}>{children}</div>
  );
}

export function sortRegisterItems(items, field, dir) {
  const list = [...(items || [])];
  const mult = dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    if (field === 'amount') return mult * ((a.amountNgn || 0) - (b.amountNgn || 0));
    if (field === 'reference') {
      return mult * String(a.reference || '').localeCompare(String(b.reference || ''), undefined, {
        sensitivity: 'base',
      });
    }
    return mult * String(a.partyName || '').localeCompare(String(b.partyName || ''), undefined, {
      sensitivity: 'base',
    });
  });
  return list;
}

export function filterRegisterItems(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter((item) => {
    const blob = [
      item.partyName,
      item.partyRef,
      item.reference,
      item.detail,
      item.category,
      formatNgn(item.amountNgn),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
}

/** Shared field styling — matches Procurement / Sales lists */
export const ACCOUNTING_FIELD_LABEL =
  'block text-[10px] font-bold uppercase tracking-wide text-slate-500';

export const ACCOUNTING_INPUT =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#134e4a]/35 focus:ring-2 focus:ring-[#134e4a]/10 shadow-sm';

/**
 * @param {{ children: React.ReactNode; className?: string }} props
 */
export function AccountingFilterGrid({ children, className = '' }) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 items-end ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * @param {{ title: string; description?: string; to?: string; state?: object; onClick?: () => void }} props
 */
export function AccountingReportLinkRow({ title, description, to, state, onClick }) {
  const inner = (
    <>
      <p className="text-[11px] font-bold text-[#134e4a]">{title}</p>
      {description ? <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">{description}</p> : null}
    </>
  );
  if (to) {
    return (
      <li className={`${ACCOUNTING_CARD_ROW} block`}>
        <Link to={to} state={state} className="block min-w-0">
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li className={`${ACCOUNTING_CARD_ROW} cursor-pointer`}>
      <button type="button" className="w-full text-left min-w-0" onClick={onClick}>
        {inner}
      </button>
    </li>
  );
}
