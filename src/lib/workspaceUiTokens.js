/** Shared Workspace command-center UI tokens (2026 ERP style). */

export const WS_SURFACE = 'rounded-xl border border-slate-200/90 bg-white shadow-sm';
export const WS_SECTION_LABEL =
  'text-xs font-semibold uppercase tracking-wide text-slate-500';

export function wsBadge(tone = 'neutral') {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    info: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    teal: 'bg-teal-50 text-teal-900 ring-teal-100',
    amber: 'bg-amber-50 text-amber-900 ring-amber-100',
    // Workspace V3 SLA palette: green / amber / red / slate only
    green: 'bg-green-50 text-green-900 ring-green-100',
    red: 'bg-red-50 text-red-800 ring-red-100',
    // Legacy aliases map onto compliant colors
    rose: 'bg-red-50 text-red-800 ring-red-100',
    emerald: 'bg-green-50 text-green-900 ring-green-100',
    restricted: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return `inline-flex items-center rounded-md px-2 py-0.5 text-ui-xs font-semibold ring-1 ${tones[tone] || tones.neutral}`;
}

export function wsPriorityBadge(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent') return wsBadge('red');
  if (p === 'high') return wsBadge('amber');
  return wsBadge('slate');
}

export function wsStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('reject') || s.includes('overdue')) return wsBadge('red');
  if (s.includes('pending') || s.includes('open') || s.includes('review')) return wsBadge('amber');
  if (s.includes('approve') || s.includes('complete') || s.includes('closed')) return wsBadge('green');
  return wsBadge('slate');
}
