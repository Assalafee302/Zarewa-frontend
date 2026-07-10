import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MANAGER_CHECKLIST_ITEMS,
  checklistCompletionPct,
  loadManagerChecklist,
  saveManagerChecklist,
  ymdLocal,
} from '../../lib/managerDailyChecklist';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';

/**
 * Opening/closing discipline checklist — local branch-day state.
 */
export function ManagerDailyChecklist({ branchId, actorName = 'Manager' }) {
  const dayIso = ymdLocal();
  const [state, setState] = useState(() => loadManagerChecklist(branchId, dayIso));

  useEffect(() => {
    setState(loadManagerChecklist(branchId, dayIso));
  }, [branchId, dayIso]);

  const pct = useMemo(() => checklistCompletionPct(state), [state]);

  const toggle = useCallback(
    (id) => {
      setState((prev) => {
        const next = { ...prev };
        const cur = next[id];
        if (cur?.done) {
          next[id] = { done: false };
        } else {
          next[id] = { done: true, at: new Date().toISOString(), by: actorName };
        }
        saveManagerChecklist(branchId, dayIso, next);
        return next;
      });
    },
    [actorName, branchId, dayIso]
  );

  const opening = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'opening');
  const closing = MANAGER_CHECKLIST_ITEMS.filter((i) => i.phase === 'closing');

  const renderGroup = (title, items) => (
    <div>
      <p className="text-ui-xs font-black uppercase tracking-[0.14em] text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const done = Boolean(state[item.id]?.done);
          const meta = state[item.id];
          return (
            <li key={item.id}>
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-zarewa-teal"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  {done && meta?.at ? (
                    <span className="block text-ui-xs text-slate-400 mt-0.5">
                      {meta.by || actorName} · {new Date(meta.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                  {item.id === 'open_attendance' && !done ? (
                    <Link
                      to={TEAM_HR_ATTENDANCE_PATH}
                      className="mt-1 inline-flex items-center gap-1 text-ui-xs font-bold text-zarewa-teal hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon size={11} aria-hidden />
                      Open attendance on My Team
                    </Link>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <section
      className="rounded-zarewa border border-slate-200/75 bg-white p-5 shadow-[var(--shadow-sequence)]"
      aria-label="Daily checklist"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-zarewa-teal" aria-hidden />
          <h3 className="text-sm font-black text-zarewa-teal tracking-tight">Daily checklist</h3>
        </div>
        <span className="text-ui-xs font-bold tabular-nums text-slate-500">{pct}% complete</span>
      </div>
      <div className="mb-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-zarewa-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {renderGroup('Opening', opening)}
        {renderGroup('Closing', closing)}
      </div>
    </section>
  );
}
