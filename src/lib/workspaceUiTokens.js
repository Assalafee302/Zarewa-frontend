/** Shared Workspace command-center UI tokens (2026 ERP style). */

export const WS_SURFACE = 'rounded-xl border border-slate-200/90 bg-white shadow-sm';
export const WS_SECTION_LABEL =
  'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

export function wsBadge(tone = 'neutral') {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    info: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    teal: 'bg-teal-50 text-teal-900 ring-teal-100',
    amber: 'bg-amber-50 text-amber-900 ring-amber-100',
    rose: 'bg-rose-50 text-rose-800 ring-rose-100',
    emerald: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
    restricted: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return `inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${tones[tone] || tones.neutral}`;
}

export function wsPriorityBadge(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent') return wsBadge('rose');
  if (p === 'high') return wsBadge('amber');
  return wsBadge('neutral');
}

export function wsStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('reject') || s.includes('overdue')) return wsBadge('rose');
  if (s.includes('pending') || s.includes('open') || s.includes('review')) return wsBadge('amber');
  if (s.includes('approve') || s.includes('complete') || s.includes('closed')) return wsBadge('emerald');
  return wsBadge('neutral');
}
