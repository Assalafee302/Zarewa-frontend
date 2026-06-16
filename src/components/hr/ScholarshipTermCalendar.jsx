import React from 'react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../lib/hrFormat';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';

const KIND_META = {
  term_start: { icon: '📅', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  term_end: { icon: '🏁', tone: 'text-amber-800 bg-amber-50 border-amber-100' },
  fee_due: { icon: '🎓', tone: 'text-violet-800 bg-violet-50 border-violet-100' },
  stipend: { icon: '💳', tone: 'text-sky-800 bg-sky-50 border-sky-100' },
};

function formatDate(iso) {
  const d = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '—';
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

/** Timeline of term dates, fee due dates, and stipend pay dates. */
export function ScholarshipTermCalendar({ events = [], compact = false }) {
  const upcoming = events.filter((e) => !e.isPast || e.isToday).slice(0, compact ? 4 : 8);
  if (!upcoming.length) {
    return (
      <p className="text-sm text-slate-500">
        Term dates will appear here once the office sets your current term.{' '}
        <Link to={HR_SELF_SERVICE_PATH.requests} className="font-semibold text-violet-700 underline">
          Request an update
        </Link>
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {upcoming.map((event) => {
        const meta = KIND_META[event.kind] || KIND_META.fee_due;
        return (
          <li
            key={`${event.kind}-${event.dateIso}-${event.label}`}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${meta.tone} ${
              event.isToday ? 'ring-2 ring-violet-300 ring-offset-1' : ''
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{event.label}</p>
              <p className="text-xs text-slate-600">
                {formatDate(event.dateIso)}
                {event.isToday ? ' · Today' : ''}
                {event.detail ? ` · ${event.detail}` : ''}
              </p>
            </div>
            {event.amountNgn != null ? (
              <p className="shrink-0 text-sm font-black tabular-nums text-slate-900">{formatNgn(event.amountNgn)}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
