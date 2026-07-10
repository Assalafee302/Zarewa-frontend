/** Purchase order status chip styling — shared across procurement lists and previews. */

export function poStatusChipClass(status) {
  const st = String(status || '').trim();
  if (st === 'Received') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (st === 'In Transit') return 'border-sky-200 bg-sky-50 text-sky-900';
  if (st === 'On loading') return 'border-violet-200 bg-violet-50 text-violet-900';
  if (st === 'Approved') return 'border-teal-200 bg-teal-50 text-teal-900';
  if (st === 'Rejected') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (st === 'Pending') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}
