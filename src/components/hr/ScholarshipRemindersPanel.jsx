import React from 'react';
import { Link } from 'react-router-dom';

const SEVERITY = {
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  urgent: 'border-rose-200 bg-rose-50 text-rose-950',
};

/**
 * @param {{ reminders?: object[] }} props
 */
export function ScholarshipRemindersPanel({ reminders = [] }) {
  if (!reminders.length) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-black text-slate-900">Reminders</h3>
      <ul className="space-y-2">
        {reminders.map((rem) => (
          <li
            key={rem.id}
            className={`rounded-xl border px-4 py-3 ${SEVERITY[rem.severity] || SEVERITY.info}`}
          >
            <p className="text-sm font-bold">{rem.title}</p>
            {rem.body ? <p className="mt-1 text-xs opacity-90">{rem.body}</p> : null}
            {rem.actionPath ? (
              <Link to={rem.actionPath} className="mt-2 inline-block text-[11px] font-bold uppercase hover:underline">
                View →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
