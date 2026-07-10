/** Customer status chip styling — shared across sales list and profile views. */

export function customerStatusChipClass(status) {
  if (String(status).toLowerCase() === 'active') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800';
  }
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export function customerTierChipClass(tier) {
  const t = String(tier || '').toLowerCase();
  if (t === 'vip') return 'border-amber-200 bg-amber-100 text-amber-900';
  if (t === 'wholesale') return 'border-sky-200 bg-sky-100 text-sky-900';
  if (t === 'staff') return 'border-teal-200 bg-teal-100 text-teal-900';
  if (t === 'trade') return 'border-indigo-200 bg-indigo-100 text-indigo-900';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export function customerPaymentChipClass(tone) {
  if (tone === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-rose-200 bg-rose-50 text-red-800';
}
