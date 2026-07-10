/** Shared customer UI tokens and badge helpers. */

export const CUSTOMER_FIELD =
  'w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-3.5 text-sm font-semibold text-zarewa-teal outline-none transition-shadow placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15';

export const CUSTOMER_SELECT =
  'w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-3 text-sm font-semibold text-zarewa-teal outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15';

export const CUSTOMER_TEXTAREA = `${CUSTOMER_FIELD} resize-none font-medium leading-relaxed`;

export const CUSTOMER_LABEL =
  'text-ui-xs font-bold uppercase tracking-widest text-slate-500 ml-0.5';

export const CUSTOMER_SECTION =
  'rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5 space-y-4';

export const CUSTOMER_SECTION_TITLE =
  'text-ui-xs font-black uppercase tracking-widest text-zarewa-teal flex items-center gap-2';

export function customerInitials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function customerStatusTone(status) {
  if (String(status).toLowerCase() === 'active') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function customerTierTone(tier) {
  const t = String(tier || '').toLowerCase();
  if (t === 'vip') return 'bg-amber-100 text-amber-900 border-amber-200';
  if (t === 'wholesale') return 'bg-sky-100 text-sky-900 border-sky-200';
  if (t === 'staff') return 'bg-teal-100 text-teal-900 border-teal-200';
  if (t === 'trade') return 'bg-indigo-100 text-indigo-900 border-indigo-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function paymentRelationshipTone(tone) {
  if (tone === 'ok') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (tone === 'warn') return 'bg-amber-50 text-amber-900 border-amber-200';
  return 'bg-red-50 text-red-800 border-red-200';
}
